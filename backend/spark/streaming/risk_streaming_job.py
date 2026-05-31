from __future__ import annotations

from pathlib import Path

from backend.app.repositories.file_repository import RiskFileRepository
from backend.spark.rdd import risk_score_engine


def calculate_risk_with_rdd_in_batch(batch_df, batch_id: int, static_df, output_dir: str | Path) -> None:
    """Structured Streaming foreachBatch hook.

    The streaming layer receives resilient micro-batches as DataFrames, then
    converts each batch to RDDs and reuses the same key-value RDD scoring engine.
    """

    if batch_df.isEmpty():
        return

    dynamic_rdd = batch_df.rdd.map(lambda row: (row["grid_id"], row.asDict(recursive=True)))
    static_rdd = static_df.rdd.map(lambda row: (row["grid_id"], row.asDict(recursive=True)))
    rows = risk_score_engine.calculate_from_feature_rdds(
        dynamic_rdd,
        static_rdd,
        batch_id=f"stream-{batch_id}",
    ).collect()
    RiskFileRepository(output_dir).save_batch(rows)


def build_stream_query(stream_df, static_df, output_dir: str | Path, checkpoint_path: str):
    return (
        stream_df.writeStream.foreachBatch(
            lambda batch_df, batch_id: calculate_risk_with_rdd_in_batch(batch_df, batch_id, static_df, output_dir)
        )
        .option("checkpointLocation", checkpoint_path)
        .start()
    )
