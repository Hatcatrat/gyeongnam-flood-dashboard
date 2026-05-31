from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable, Iterable


class LocalRDD:
    """A tiny RDD-compatible adapter for sample runs and tests without PySpark.

    Production batch jobs use PySpark RDDs. This adapter keeps the same map,
    filter, join, mapValues, and reduceByKey flow available when PySpark is not
    installed locally, so the rest of the pipeline can still be exercised.
    """

    def __init__(self, rows: Iterable[Any], partitions: int = 1):
        self._rows = list(rows)
        self._partitions = max(1, int(partitions))

    def map(self, func: Callable[[Any], Any]) -> "LocalRDD":
        return LocalRDD((func(row) for row in self._rows), self._partitions)

    def mapValues(self, func: Callable[[Any], Any]) -> "LocalRDD":  # noqa: N802 - Spark API compatibility.
        return LocalRDD(((key, func(value)) for key, value in self._rows), self._partitions)

    def filter(self, func: Callable[[Any], bool]) -> "LocalRDD":
        return LocalRDD((row for row in self._rows if func(row)), self._partitions)

    def reduceByKey(self, func: Callable[[Any, Any], Any]) -> "LocalRDD":  # noqa: N802
        reduced: dict[Any, Any] = {}
        for key, value in self._rows:
            reduced[key] = func(reduced[key], value) if key in reduced else value
        return LocalRDD(reduced.items(), self._partitions)

    def combineByKey(  # noqa: N802
        self,
        create_combiner: Callable[[Any], Any],
        merge_value: Callable[[Any, Any], Any],
        merge_combiners: Callable[[Any, Any], Any],
    ) -> "LocalRDD":
        combined: dict[Any, Any] = {}
        for key, value in self._rows:
            combined[key] = merge_value(combined[key], value) if key in combined else create_combiner(value)
        # There is only one local partition, so merge_combiners is kept for API compatibility.
        _ = merge_combiners
        return LocalRDD(combined.items(), self._partitions)

    def join(self, other: "LocalRDD") -> "LocalRDD":
        right: dict[Any, list[Any]] = defaultdict(list)
        for key, value in other.collect():
            right[key].append(value)
        joined = []
        for key, left_value in self._rows:
            for right_value in right.get(key, []):
                joined.append((key, (left_value, right_value)))
        return LocalRDD(joined, self._partitions)

    def collect(self) -> list[Any]:
        return list(self._rows)

    def count(self) -> int:
        return len(self._rows)

    def takeOrdered(self, count: int, key: Callable[[Any], Any] | None = None) -> list[Any]:  # noqa: N802
        return sorted(self._rows, key=key)[:count]

    def getNumPartitions(self) -> int:  # noqa: N802
        return self._partitions
