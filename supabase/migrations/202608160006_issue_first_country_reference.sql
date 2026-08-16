-- Local, checked-in country-name reference for the Issue-first actor-arc contract.
-- Country text is first grounded in the article, then matched exactly to its ISO alpha-3 code
-- here. Unknown names are withheld rather than mapped to a plausible but wrong country.

create table if not exists public.terra_space_issue_v2_country_reference (
  country_iso3 text primary key check (country_iso3 ~ '^[A-Z]{3}$'),
  country_name text not null unique check (btrim(country_name) <> '')
);

insert into public.terra_space_issue_v2_country_reference (country_iso3, country_name) values
  ('AND','Andorra'),('ARE','United Arab Emirates'),('AFG','Afghanistan'),('ATG','Antigua & Barbuda'),('AIA','Anguilla'),('ALB','Albania'),('ARM','Armenia'),('AGO','Angola'),('ARG','Argentina'),('ASM','American Samoa'),('AUT','Austria'),('AUS','Australia'),('ABW','Aruba'),('ALA','Åland Islands'),('AZE','Azerbaijan'),('BIH','Bosnia & Herzegovina'),('BRB','Barbados'),('BGD','Bangladesh'),('BEL','Belgium'),('BFA','Burkina Faso'),('BGR','Bulgaria'),('BHR','Bahrain'),('BDI','Burundi'),('BEN','Benin'),('BLM','St. Barthélemy'),('BMU','Bermuda'),('BRN','Brunei'),('BOL','Bolivia'),('BES','Bonaire, Sint Eustatius and Saba'),('BRA','Brazil'),('BHS','Bahamas'),('BTN','Bhutan'),('BWA','Botswana'),('BLR','Belarus'),('BLZ','Belize'),('CAN','Canada'),('CCK','Cocos (Keeling) Islands'),('COD','Congo (DRC)'),('CAF','Central African Republic'),('COG','Congo'),('CHE','Switzerland'),('CIV','Côte d’Ivoire'),('COK','Cook Islands'),('CHL','Chile'),('CMR','Cameroon'),('CHN','China'),('COL','Colombia'),('CRI','Costa Rica'),('CUB','Cuba'),('CPV','Cabo Verde'),('CUW','Curaçao'),('CXR','Christmas Island'),('CYP','Cyprus'),('CZE','Czechia'),('DEU','Germany'),('DJI','Djibouti'),('DNK','Denmark'),('DMA','Dominica'),('DOM','Dominican Republic'),('DZA','Algeria'),('ECU','Ecuador'),('EST','Estonia'),('EGY','Egypt'),('ERI','Eritrea'),('ESP','Spain'),('ETH','Ethiopia'),('FIN','Finland'),('FJI','Fiji'),('FLK','Falkland Islands'),('FSM','Micronesia'),('FRO','Faroe Islands'),('FRA','France'),('GAB','Gabon'),('GBR','United Kingdom'),('GRD','Grenada'),('GEO','Georgia'),('GUF','French Guiana'),('GGY','Guernsey'),('GHA','Ghana'),('GIB','Gibraltar'),('GRL','Greenland'),('GMB','Gambia'),('GIN','Guinea'),('GLP','Guadeloupe'),('GNQ','Equatorial Guinea'),('GRC','Greece'),('SGS','South Georgia & South Sandwich Islands'),('GTM','Guatemala'),('GUM','Guam'),('GNB','Guinea-Bissau'),('GUY','Guyana'),('HKG','Hong Kong SAR'),('HND','Honduras'),('HRV','Croatia'),('HTI','Haiti'),('HUN','Hungary'),('IDN','Indonesia'),('IRL','Ireland'),('ISR','Israel'),('IMN','Isle of Man'),('IND','India'),('IOT','British Indian Ocean Territory'),('IRQ','Iraq'),('IRN','Iran'),('ISL','Iceland'),('ITA','Italy'),('JEY','Jersey'),('JAM','Jamaica'),('JOR','Jordan'),('JPN','Japan'),('KEN','Kenya'),('KGZ','Kyrgyzstan'),('KHM','Cambodia'),('KIR','Kiribati'),('COM','Comoros'),('KNA','St. Kitts & Nevis'),('PRK','North Korea'),('KOR','Korea'),('KWT','Kuwait'),('CYM','Cayman Islands'),('KAZ','Kazakhstan'),('LAO','Laos'),('LBN','Lebanon'),('LCA','St. Lucia'),('LIE','Liechtenstein'),('LKA','Sri Lanka'),('LBR','Liberia'),('LSO','Lesotho'),('LTU','Lithuania'),('LUX','Luxembourg'),('LVA','Latvia'),('LBY','Libya'),('MAR','Morocco'),('MCO','Monaco'),('MDA','Moldova'),('MNE','Montenegro'),('MAF','St. Martin'),('MDG','Madagascar'),('MHL','Marshall Islands'),('MKD','North Macedonia'),('MLI','Mali'),('MMR','Myanmar'),('MNG','Mongolia'),('MAC','Macao SAR'),('MNP','Northern Mariana Islands'),('MTQ','Martinique'),('MRT','Mauritania'),('MSR','Montserrat'),('MLT','Malta'),('MUS','Mauritius'),('MDV','Maldives'),('MWI','Malawi'),('MEX','Mexico'),('MYS','Malaysia'),('MOZ','Mozambique'),('NAM','Namibia'),('NCL','New Caledonia'),('NER','Niger'),('NFK','Norfolk Island'),('NGA','Nigeria'),('NIC','Nicaragua'),('NLD','Netherlands'),('NOR','Norway'),('NPL','Nepal'),('NRU','Nauru'),('NIU','Niue'),('NZL','New Zealand'),('OMN','Oman'),('PAN','Panama'),('PER','Peru'),('PYF','French Polynesia'),('PNG','Papua New Guinea'),('PHL','Philippines'),('PAK','Pakistan'),('POL','Poland'),('SPM','St. Pierre & Miquelon'),('PCN','Pitcairn Islands'),('PRI','Puerto Rico'),('PSE','Palestinian Authority'),('PRT','Portugal'),('PLW','Palau'),('PRY','Paraguay'),('QAT','Qatar'),('REU','Réunion'),('ROU','Romania'),('SRB','Serbia'),('RUS','Russia'),('RWA','Rwanda'),('SAU','Saudi Arabia'),('SLB','Solomon Islands'),('SYC','Seychelles'),('SDN','Sudan'),('SWE','Sweden'),('SGP','Singapore'),('SHN','St Helena, Ascension, Tristan da Cunha'),('SVN','Slovenia'),('SJM','Svalbard & Jan Mayen'),('SVK','Slovakia'),('SLE','Sierra Leone'),('SMR','San Marino'),('SEN','Senegal'),('SOM','Somalia'),('SUR','Suriname'),('SSD','South Sudan'),('STP','São Tomé & Príncipe'),('SLV','El Salvador'),('SXM','Sint Maarten'),('SYR','Syria'),('SWZ','Eswatini'),('TCA','Turks & Caicos Islands'),('TCD','Chad'),('ATF','French Southern Territories'),('TGO','Togo'),('THA','Thailand'),('TJK','Tajikistan'),('TKL','Tokelau'),('TLS','Timor-Leste'),('TKM','Turkmenistan'),('TUN','Tunisia'),('TON','Tonga'),('TUR','Türkiye'),('TTO','Trinidad & Tobago'),('TUV','Tuvalu'),('TWN','Taiwan'),('TZA','Tanzania'),('UKR','Ukraine'),('UGA','Uganda'),('USA','United States'),('URY','Uruguay'),('UZB','Uzbekistan'),('VAT','Vatican City'),('VCT','St. Vincent & Grenadines'),('VEN','Venezuela'),('VGB','British Virgin Islands'),('VIR','U.S. Virgin Islands'),('VNM','Vietnam'),('VUT','Vanuatu'),('WLF','Wallis & Futuna'),('WSM','Samoa'),('XKX','Kosovo'),('YEM','Yemen'),('MYT','Mayotte'),('ZAF','South Africa'),('ZMB','Zambia'),('ZWE','Zimbabwe')
on conflict do nothing;

alter table public.terra_space_issue_v2_country_reference enable row level security;

create or replace function public.terra_space_issue_v2_assert_grounded_endpoint(
  p_endpoint jsonb,
  p_source_text text,
  p_role text
)
returns void
language plpgsql
stable
as $$
declare
  v_actor_name text;
  v_evidence_quote text;
  v_country_iso3 text;
  v_country_name text;
  v_admin1 text;
  v_city_regency text;
begin
  if jsonb_typeof(p_endpoint) <> 'object' then
    raise exception '% endpoint must be an object.', p_role using errcode = '23514';
  end if;
  v_actor_name := nullif(btrim(coalesce(p_endpoint ->> 'name', '')), '');
  if v_actor_name is null then
    raise exception '% actor name is required.', p_role using errcode = '23514';
  end if;
  v_evidence_quote := p_endpoint ->> 'evidence_quote';
  perform public.terra_space_issue_v2_assert_grounded_quote(v_evidence_quote, p_source_text, format('%s location evidence quote', p_role));
  if position(lower(v_actor_name) in lower(v_evidence_quote)) = 0 then
    raise exception '% actor name is not supported by its evidence quote.', p_role using errcode = '23514';
  end if;
  v_country_iso3 := upper(nullif(btrim(coalesce(p_endpoint ->> 'country_iso3', '')), ''));
  v_country_name := nullif(btrim(coalesce(p_endpoint ->> 'country_name', '')), '');
  if v_country_iso3 is null or v_country_iso3 !~ '^[A-Z]{3}$' or v_country_name is null then
    raise exception '% location needs country_iso3 and grounded country text.', p_role using errcode = '23514';
  end if;
  if position(lower(v_country_name) in lower(v_evidence_quote)) = 0 then
    raise exception '% location country text is not supported by its evidence quote.', p_role using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.terra_space_issue_v2_country_reference reference
     where reference.country_iso3 = v_country_iso3
       and lower(reference.country_name) = lower(v_country_name)
  ) then
    raise exception '% location country text does not match country_iso3 % in the local reference.', p_role, v_country_iso3
      using errcode = '23514';
  end if;
  v_admin1 := nullif(btrim(coalesce(p_endpoint ->> 'admin1', '')), '');
  v_city_regency := nullif(btrim(coalesce(p_endpoint ->> 'city_regency', '')), '');
  if v_admin1 is not null and position(lower(v_admin1) in lower(v_evidence_quote)) = 0 then
    raise exception '% location evidence quote does not name admin1 "%".', p_role, v_admin1 using errcode = '23514';
  end if;
  if v_city_regency is not null and position(lower(v_city_regency) in lower(v_evidence_quote)) = 0 then
    raise exception '% location evidence quote does not name city_regency "%".', p_role, v_city_regency using errcode = '23514';
  end if;
end;
$$;

comment on table public.terra_space_issue_v2_country_reference is
  'Checked-in local canonical country names paired with ISO alpha-3 codes for Issue-first endpoint validation.';
