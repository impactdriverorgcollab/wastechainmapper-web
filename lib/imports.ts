import type { ImportKind } from './types';

export interface ImportColumn { name: string; required: boolean; help: string }
export interface ImportTemplate {
  kind: ImportKind;
  title: string;
  summary: string;
  columns: ImportColumn[];
  example: string[];
}

const col = (name: string, required: boolean, help: string): ImportColumn => ({ name, required, help });

export const IMPORT_TEMPLATES: ImportTemplate[] = [
  {
    kind: 'area-indicators',
    title: 'Area figures',
    summary: 'One figure for a whole local government area from another sector: population, a health count, a water-quality average. Only area totals, never a record about a person. A figure for the same area, indicator and period replaces the earlier one.',
    columns: [
      col('lga', true, 'One of the 23 Rivers State areas, for example Obio-Akpor.'),
      col('indicator', true, 'A short name, for example population, cholera_cases or water_ecoli_mean. Use population for the census figure, which the coverage table divides by.'),
      col('value', true, 'The number.'),
      col('period', false, 'The year or month it covers, for example 2022 or 2026-09.'),
      col('unit', false, 'For example people, cases or CFU per 100 ml.'),
      col('source', true, 'Who published it, for example "UNFPA and US Census Bureau, COD-PS 2022".'),
      col('restricted', false, 'yes if only partners and staff may see it, for example health figures shared on that condition. No by default.'),
      col('notes', false, 'Anything a reader should know.'),
    ],
    example: ['Obio-Akpor', 'population', '1036650', '2022', 'people', 'UNFPA and US Census Bureau, COD-PS 2022', 'no', ''],
  },
  {
    kind: 'dump-sites',
    title: 'Dump sites',
    summary: 'Known dump sites from field visits, community leaders or agency lists. Only the community name is needed: we find its position from our list of places. A site within 150 metres of one already on the map is skipped.',
    columns: [
      col('community', true, 'The community or place, spelled as on the map, for example Iwofe.'),
      col('lga', false, 'Local government area. Needed only when two places share a name.'),
      col('latitude', false, 'Give latitude and longitude for the exact spot, or leave both empty to use the community centre.'),
      col('longitude', false, 'See latitude.'),
      col('waste_type', false, 'Municipal, organic, plastic, industrial, medical, electronic, construction, mixed or unknown (the default).'),
      col('confidence', false, 'Unconfirmed (the default), corroborated or field verified. Say field verified only if someone saw the site in person.'),
      col('ward', false, 'Ward.'),
      col('description', false, 'What was seen.'),
    ],
    example: ['Iwofe', 'Obio-Akpor', '', '', 'Municipal', 'Unconfirmed', '', 'Refuse heap along the access road'],
  },
  {
    kind: 'facilities',
    title: 'Facilities',
    summary: 'Landfills, transfer stations, recycling plants and incinerators. A facility with the same name and type is updated, not duplicated.',
    columns: [
      col('name', true, 'The facility name.'),
      col('type', true, 'Landfill, transfer station, recycling, incineration or collection point.'),
      col('latitude', true, 'Decimal degrees, for example 4.79.'),
      col('longitude', true, 'Decimal degrees, for example 7.12.'),
      col('capacity_tpd', false, 'Tonnes it can handle per day.'),
      col('operator', false, 'Who runs it.'),
      col('lga', false, 'Local government area.'),
      col('ward', false, 'Ward.'),
      col('description', false, 'Anything useful.'),
    ],
    example: ['Eleme transfer station', 'Transfer station', '4.79', '7.12', '500', 'RIWAMA', 'Eleme', '', ''],
  },
  {
    kind: 'waste-flows',
    title: 'Waste collected (tonnage)',
    summary: 'One row per collection or delivery. Every row needs a unique reference, so uploading the same file twice never counts a load twice.',
    columns: [
      col('reference', true, 'A unique ID, such as a weighbridge ticket number.'),
      col('date', true, 'Like 2026-03-14 or 14/03/2026.'),
      col('waste_type', true, 'Municipal, organic, plastic, industrial, medical, electronic, construction, mixed or unknown.'),
      col('tonnage', true, 'Tonnes, above zero.'),
      col('status', false, 'Collected (the default), in transit, delivered or processed.'),
      col('facility', false, 'Name of a facility you have already imported.'),
      col('vehicle_plate', false, 'Truck plate number. New plates are registered automatically.'),
      col('lga', false, 'Local government area.'),
      col('ward', false, 'Ward.'),
      col('origin_lat', false, 'Where it was collected. Give both origin_lat and origin_lng, or neither.'),
      col('origin_lng', false, 'See origin_lat.'),
      col('notes', false, 'Anything useful.'),
    ],
    example: ['TKT-0001', '2026-03-14', 'Municipal', '12.5', 'Delivered', 'Eleme transfer station', 'RV 123 ABC', 'Eleme', '', '', '', ''],
  },
  {
    kind: 'water-readings',
    title: 'Water readings',
    summary: 'Manual or sensor measurements for water points already on the map. Give at least one measurement per row.',
    columns: [
      col('reference', true, 'A unique ID for the reading.'),
      col('source', true, 'The water point. Use its source_ref from the water point list below, because many points share a name.'),
      col('recorded_at', true, 'Like 2026-03-14 or 14/03/2026 09:30.'),
      col('ph', false, '0 to 14.'),
      col('turbidity_ntu', false, 'Cloudiness in NTU.'),
      col('volume_m3', false, 'Volume in cubic metres.'),
      col('quality_score', false, '0 to 100.'),
      col('sensor', false, 'Yes if it came from a sensor, otherwise No.'),
      col('notes', false, 'Anything useful.'),
    ],
    example: ['RD-0001', 'wpdx-example-id', '2026-03-14 09:30', '6.8', '4.2', '', '', 'No', ''],
  },
];
