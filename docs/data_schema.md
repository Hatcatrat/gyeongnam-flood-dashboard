# Data Schema

## Raw Dynamic Data

### weather.csv

- `grid_id`
- `sido`
- `sigungu`
- `observed_at`
- `rain_10m`
- `rain_1h`
- `rain_3h`

### water_level.csv

- `grid_id`
- `station_id`
- `observed_at`
- `water_level`
- `previous_water_level`
- `water_level_diff`

## Raw Static Data

### flood_history.csv

- `grid_id`
- `flood_history_score`
- `flood_count`
- `max_flood_depth`

### terrain.csv

- `grid_id`
- `slope_score`
- `lowland_score`
- `river_distance_score`
- `impervious_score`

## Processed Storage

### risk_latest

- `grid_id`
- `sido`
- `sigungu`
- `risk_score`
- `risk_level`
- `updated_at`
- `batch_id`
- `previous_risk_score`
- `score_delta`

### risk_history

- `id`
- `grid_id`
- `sido`
- `sigungu`
- `risk_score`
- `risk_level`
- `calculated_at`
- `batch_id`

### risk_feature

- `id`
- `grid_id`
- `sido`
- `sigungu`
- `rain_10m`
- `rain_1h`
- `rain_3h`
- `water_level`
- `water_level_diff`
- `flood_history_score`
- `slope_score`
- `rain_contribution`
- `water_level_contribution`
- `flood_history_contribution`
- `terrain_contribution`
- `calculated_at`
- `batch_id`
