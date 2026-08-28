// -----------------------------------------------------------------------------
// Gladys feature builders (port of the core netatmo.buildFeatures* modules).
//
// Every builder produces the exact same feature as the core service — same
// suffix, category, type, unit, bounds — so the two implementations stay easy
// to diff. Feature external_ids are `<deviceExternalId>:<suffix>` and the
// suffixes are FROZEN once shipped.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
} from '@gladysassistant/integration-sdk';

import { THERMOSTAT_MODE_OPTIONS } from './constants.js';

function feature(overrides) {
  return {
    read_only: true,
    keep_history: true,
    has_feedback: false,
    ...overrides,
  };
}

export function buildFeatureBattery(name, externalId) {
  return feature({
    name: `Battery - ${name}`,
    external_id: `${externalId}:battery_percent`,
    selector: `${externalId}:battery_percent`,
    category: DEVICE_FEATURE_CATEGORIES.BATTERY,
    type: DEVICE_FEATURE_TYPES.BATTERY.INTEGER,
    unit: DEVICE_FEATURE_UNITS.PERCENT,
    min: 0,
    max: 100,
  });
}

export function buildFeatureRfStrength(name, externalId) {
  return feature({
    name: `Link RF quality - ${name}`,
    external_id: `${externalId}:rf_strength`,
    selector: `${externalId}:rf_strength`,
    category: DEVICE_FEATURE_CATEGORIES.SIGNAL,
    type: DEVICE_FEATURE_TYPES.SIGNAL.QUALITY,
    min: 0,
    max: 100,
  });
}

export function buildFeatureWifiStrength(name, externalId) {
  return feature({
    name: `Link Wifi quality - ${name}`,
    external_id: `${externalId}:wifi_strength`,
    selector: `${externalId}:wifi_strength`,
    category: DEVICE_FEATURE_CATEGORIES.SIGNAL,
    type: DEVICE_FEATURE_TYPES.SIGNAL.QUALITY,
    min: 0,
    max: 100,
  });
}

export function buildFeatureTemperature(
  name,
  externalId,
  featureName,
  type = DEVICE_FEATURE_TYPES.SENSOR.DECIMAL,
) {
  return feature({
    name: `Temperature - ${name}`,
    external_id: `${externalId}:${featureName}`,
    selector: `${externalId}:${featureName}`,
    category: DEVICE_FEATURE_CATEGORIES.TEMPERATURE_SENSOR,
    type,
    unit: DEVICE_FEATURE_UNITS.CELSIUS,
    min: -10,
    max: 50,
  });
}

export function buildFeatureThermSetpointTemperature(name, externalId, { writable = true } = {}) {
  return feature({
    name: `Setpoint temperature - ${name}`,
    external_id: `${externalId}:therm_setpoint_temperature`,
    selector: `${externalId}:therm_setpoint_temperature`,
    category: DEVICE_FEATURE_CATEGORIES.THERMOSTAT,
    type: DEVICE_FEATURE_TYPES.THERMOSTAT.TARGET_TEMPERATURE,
    unit: DEVICE_FEATURE_UNITS.CELSIUS,
    // Read-only for legacy-only thermostats without home_id/room_id: the
    // setroomthermpoint command cannot be built for them.
    read_only: !writable,
    min: 5,
    max: 30,
  });
}

// Thermostat mode (SDK 0.11.0+): the Gladys enum is a HVAC vocabulary, so only
// off/heating(manual)/auto(schedule) are offered — `supported_options` narrows
// the front's hardcoded list to what a Netatmo thermostat can do (no cooling).
// Frost guard and away have no Gladys value and get their own features below;
// see docs/PROPOSAL-thermostat-modes.md.
export function buildFeatureThermostatMode(name, externalId, { writable = true } = {}) {
  return feature({
    name: `Mode - ${name}`,
    external_id: `${externalId}:therm_setpoint_mode`,
    selector: `${externalId}:therm_setpoint_mode`,
    category: DEVICE_FEATURE_CATEGORIES.THERMOSTAT,
    type: DEVICE_FEATURE_TYPES.THERMOSTAT.MODE,
    read_only: !writable,
    supported_options: THERMOSTAT_MODE_OPTIONS,
    min: 0,
    max: 3,
  });
}

// Whether the room is actually calling for heat (SDK 0.11.0+): the standard
// counterpart of the raw heating_power_request / boiler_status booleans.
export function buildFeatureOperatingState(name, externalId) {
  return feature({
    name: `Operating state - ${name}`,
    external_id: `${externalId}:operating_state`,
    selector: `${externalId}:operating_state`,
    category: DEVICE_FEATURE_CATEGORIES.THERMOSTAT,
    type: DEVICE_FEATURE_TYPES.THERMOSTAT.OPERATING_STATE,
    min: 0,
    max: 2,
  });
}

// Frost guard (Netatmo `hg`): keeps the room at a floor temperature (~7 °C).
// A dedicated writable switch because THERMOSTAT_MODE has no member for it —
// folding it onto OFF would tell the user the home is unprotected while it is
// in fact still being protected.
export function buildFeatureFrostGuard(name, externalId, { writable = true } = {}) {
  return feature({
    name: `Frost guard - ${name}`,
    external_id: `${externalId}:frost_guard`,
    selector: `${externalId}:frost_guard`,
    category: DEVICE_FEATURE_CATEGORIES.SWITCH,
    type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
    read_only: !writable,
    min: 0,
    max: 1,
  });
}

// Away mode (Netatmo `away`), same rationale as the frost guard above.
export function buildFeatureAway(name, externalId, { writable = true } = {}) {
  return feature({
    name: `Away - ${name}`,
    external_id: `${externalId}:away`,
    selector: `${externalId}:away`,
    category: DEVICE_FEATURE_CATEGORIES.SWITCH,
    type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
    read_only: !writable,
    min: 0,
    max: 1,
  });
}

// The thermostat is pre-heating to reach the scheduled setpoint on time.
export function buildFeatureAnticipating(name, externalId) {
  return feature({
    name: `Anticipating - ${name}`,
    external_id: `${externalId}:anticipating`,
    selector: `${externalId}:anticipating`,
    category: DEVICE_FEATURE_CATEGORIES.SWITCH,
    type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
    min: 0,
    max: 1,
  });
}

// Raw battery voltage in millivolts (NATherm1 reports `battery_level`), next to
// the coarse percentage derived from the `battery_state` string: 3767 mV tracks
// wear far more finely than the five "high/medium/low" buckets.
export function buildFeatureBatteryVoltage(name, externalId) {
  return feature({
    name: `Battery voltage - ${name}`,
    external_id: `${externalId}:battery_level`,
    selector: `${externalId}:battery_level`,
    category: DEVICE_FEATURE_CATEGORIES.ENERGY_SENSOR,
    type: DEVICE_FEATURE_TYPES.ENERGY_SENSOR.VOLTAGE,
    unit: DEVICE_FEATURE_UNITS.MILLI_VOLT,
    min: 0,
    max: 10000,
  });
}

export function buildFeatureBoilerStatus(name, externalId) {
  return feature({
    name: `Boiler status - ${name}`,
    external_id: `${externalId}:boiler_status`,
    selector: `${externalId}:boiler_status`,
    category: DEVICE_FEATURE_CATEGORIES.SWITCH,
    type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
    min: 0,
    max: 1,
  });
}

export function buildFeatureHeatingPowerRequest(name, externalId) {
  return feature({
    name: `Heating power request - ${name}`,
    external_id: `${externalId}:heating_power_request`,
    selector: `${externalId}:heating_power_request`,
    category: DEVICE_FEATURE_CATEGORIES.SWITCH,
    type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
    min: 0,
    max: 1,
  });
}

export function buildFeaturePlugConnectedBoiler(name, externalId) {
  return feature({
    name: `${name} connected boiler`,
    external_id: `${externalId}:plug_connected_boiler`,
    selector: `${externalId}:plug_connected_boiler`,
    category: DEVICE_FEATURE_CATEGORIES.SWITCH,
    type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
    min: 0,
    max: 1,
  });
}

// Camera monitoring switch (core PR #2621, made writable by core PR #2623:
// the command goes through /api/setstate).
export function buildFeatureMonitoring(name, externalId) {
  return feature({
    name: `Monitoring - ${name}`,
    external_id: `${externalId}:monitoring`,
    selector: `${externalId}:monitoring`,
    category: DEVICE_FEATURE_CATEGORIES.SWITCH,
    type: DEVICE_FEATURE_TYPES.SWITCH.BINARY,
    read_only: false,
    min: 0,
    max: 1,
  });
}

// Camera image shown in the Gladys camera dashboard (core PR #2623).
export function buildFeatureCamera(name, externalId) {
  return feature({
    name: `Camera - ${name}`,
    external_id: `${externalId}:camera`,
    selector: `${externalId}:camera`,
    category: DEVICE_FEATURE_CATEGORIES.CAMERA,
    type: DEVICE_FEATURE_TYPES.CAMERA.IMAGE,
    keep_history: false,
    min: 0,
    max: 0,
  });
}

// --- Momentary event features (webhook-driven, issue #5) --------------------
// These exist only in the Netatmo event stream: no API state reports them, so
// they are published from the webhook payload and reset after EVENT_RESET_MS.

export function buildFeatureMotion(name, externalId) {
  return feature({
    name: `Motion - ${name}`,
    external_id: `${externalId}:motion`,
    selector: `${externalId}:motion`,
    category: DEVICE_FEATURE_CATEGORIES.MOTION_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
    min: 0,
    max: 1,
  });
}

export function buildFeatureHuman(name, externalId) {
  return feature({
    name: `Person detected - ${name}`,
    external_id: `${externalId}:human`,
    selector: `${externalId}:human`,
    category: DEVICE_FEATURE_CATEGORIES.PRESENCE_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
    min: 0,
    max: 1,
  });
}

// Outdoor camera (NOC) only: it classifies what it sees.
export function buildFeatureAnimal(name, externalId) {
  return feature({
    name: `Animal detected - ${name}`,
    external_id: `${externalId}:animal`,
    selector: `${externalId}:animal`,
    category: DEVICE_FEATURE_CATEGORIES.MOTION_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
    min: 0,
    max: 1,
  });
}

export function buildFeatureVehicle(name, externalId) {
  return feature({
    name: `Vehicle detected - ${name}`,
    external_id: `${externalId}:vehicle`,
    selector: `${externalId}:vehicle`,
    category: DEVICE_FEATURE_CATEGORIES.MOTION_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
    min: 0,
    max: 1,
  });
}

// Smoke alarm (NSD): the smoke state is webhook-only — the homestatus payload
// never reports it.
export function buildFeatureSmoke(name, externalId) {
  return feature({
    name: `Smoke - ${name}`,
    external_id: `${externalId}:smoke`,
    selector: `${externalId}:smoke`,
    category: DEVICE_FEATURE_CATEGORIES.SMOKE_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
    min: 0,
    max: 1,
  });
}

// Door/window tag (NACamDoorTag): open/closed contact, read from homestatus
// `status` (issue #9). Distinct suffix from the thermostat `open_window`.
export function buildFeatureOpeningSensor(name, externalId) {
  return feature({
    name: `Opening - ${name}`,
    external_id: `${externalId}:opening`,
    selector: `${externalId}:opening`,
    category: DEVICE_FEATURE_CATEGORIES.OPENING_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
    min: 0,
    max: 1,
  });
}

// Indoor siren (NIS): read-only sounding state for now (control is a later
// milestone), read from homestatus `status` (issue #9).
export function buildFeatureSiren(name, externalId) {
  return feature({
    name: `Siren - ${name}`,
    external_id: `${externalId}:siren`,
    selector: `${externalId}:siren`,
    category: DEVICE_FEATURE_CATEGORIES.SIREN,
    type: DEVICE_FEATURE_TYPES.SIREN.BINARY,
    min: 0,
    max: 1,
  });
}

export function buildFeatureOpenWindow(name, externalId) {
  return feature({
    name: `Detecting open window - ${name}`,
    external_id: `${externalId}:open_window`,
    selector: `${externalId}:open_window`,
    category: DEVICE_FEATURE_CATEGORIES.OPENING_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.BINARY,
    min: 0,
    max: 1,
  });
}

export function buildFeatureCo2(name, externalId) {
  return feature({
    name: `CO2 - ${name}`,
    external_id: `${externalId}:co2`,
    selector: `${externalId}:co2`,
    category: DEVICE_FEATURE_CATEGORIES.CO2_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
    unit: DEVICE_FEATURE_UNITS.PPM,
    min: 0,
    max: 5000,
  });
}

export function buildFeatureHumidity(name, externalId) {
  return feature({
    name: `Humidity - ${name}`,
    external_id: `${externalId}:humidity`,
    selector: `${externalId}:humidity`,
    category: DEVICE_FEATURE_CATEGORIES.HUMIDITY_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.DECIMAL,
    unit: DEVICE_FEATURE_UNITS.PERCENT,
    min: 0,
    max: 100,
  });
}

export function buildFeatureNoise(name, externalId) {
  return feature({
    name: `Noise - ${name}`,
    external_id: `${externalId}:noise`,
    selector: `${externalId}:noise`,
    category: DEVICE_FEATURE_CATEGORIES.NOISE_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
    unit: DEVICE_FEATURE_UNITS.DECIBEL,
    min: 0,
    max: 250,
  });
}

export function buildFeaturePressure(name, externalId, featureName) {
  return feature({
    name,
    external_id: `${externalId}:${featureName}`,
    selector: `${externalId}:${featureName}`,
    category: DEVICE_FEATURE_CATEGORIES.PRESSURE_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
    unit: DEVICE_FEATURE_UNITS.MILLIBAR,
    min: -1000,
    max: 2000,
  });
}

export function buildFeatureWindStrength(name, externalId, featureName) {
  return feature({
    name,
    external_id: `${externalId}:${featureName}`,
    selector: `${externalId}:${featureName}`,
    category: DEVICE_FEATURE_CATEGORIES.SPEED_SENSOR,
    type: DEVICE_FEATURE_TYPES.SPEED_SENSOR.INTEGER,
    unit: DEVICE_FEATURE_UNITS.KILOMETER_PER_HOUR,
    min: 0,
    max: 300,
  });
}

export function buildFeatureWindAngle(name, externalId, featureName) {
  return feature({
    name,
    external_id: `${externalId}:${featureName}`,
    selector: `${externalId}:${featureName}`,
    category: DEVICE_FEATURE_CATEGORIES.ANGLE_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
    unit: DEVICE_FEATURE_UNITS.DEGREE,
    min: 0,
    max: 360,
  });
}

export function buildFeatureRain(name, externalId, featureName, unit) {
  return feature({
    name,
    external_id: `${externalId}:${featureName}`,
    selector: `${externalId}:${featureName}`,
    category: DEVICE_FEATURE_CATEGORIES.PRECIPITATION_SENSOR,
    type: DEVICE_FEATURE_TYPES.SENSOR.DECIMAL,
    unit,
    min: 0,
    max: 100,
  });
}
