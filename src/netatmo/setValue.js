// -----------------------------------------------------------------------------
// User command → Netatmo (port of the core netatmo.setValue.js).
//
// Two writable features:
//   - thermostat setpoint: POST /api/setroomthermpoint with the device's
//     home_id/room_id params and mode `manual`;
//   - camera monitoring: POST /api/setstate (JSON) with the home_id param and
//     the camera module id — no room required (core PR #2623).
// A 403 with the Netatmo error code 13 means the token lacks the write scope
// — surfaced as a clear "reconnect" message.
// -----------------------------------------------------------------------------

import { DEVICE_FEATURE_CATEGORIES, DEVICE_FEATURE_TYPES } from '@gladysassistant/integration-sdk';

import { PARAMS, SUPPORTED_MODULE_TYPE, NETATMO_SETPOINT_MODE } from './constants.js';
import { writeValues } from './deviceMapping.js';

const CAMERA_MODELS = [SUPPORTED_MODULE_TYPE.NACAMERA, SUPPORTED_MODULE_TYPE.NOC];
const THERMOSTAT_MODELS = [SUPPORTED_MODULE_TYPE.THERMOSTAT, SUPPORTED_MODULE_TYPE.NRV];

// Feature suffixes standing in for the Netatmo modes Gladys has no value for.
const MODE_SWITCH_TO_SETPOINT_MODE = {
  frost_guard: NETATMO_SETPOINT_MODE.FROST_GUARD,
  away: NETATMO_SETPOINT_MODE.AWAY,
};
const THERMOSTAT_MODE_SWITCHES = Object.keys(MODE_SWITCH_TO_SETPOINT_MODE);

/** Read a device param value by name. */
export function getDeviceParam(device, name) {
  return (device.params ?? []).find((param) => param.name === name)?.value;
}

function rethrowScopeError(err) {
  if (err.status === 403 && err.body?.error?.code === 13) {
    // Core behaviour: scope-rights failure gets its own actionable message.
    throw new Error(
      'Netatmo rejected the command (missing scope rights) — please reconnect your Netatmo account',
      { cause: err },
    );
  }
  throw err;
}

/**
 * Apply a user command on a Netatmo device.
 * @param {object} deps `{gladys, client}` SDK instance + Netatmo API client
 * @param {object} command `{device, feature, value}` from the SDK
 * @returns {Promise<void>} resolves when Netatmo acknowledged the command
 */
export async function setDeviceValue({ gladys, client }, { device, feature, value }) {
  const transform = writeValues[feature.category]?.[feature.type];
  const isCameraMonitoring =
    CAMERA_MODELS.includes(device.model) && feature.external_id.endsWith(':monitoring');
  // Frost guard and away have no THERMOSTAT_MODE member, so they ride on their
  // own switch features (see docs/PROPOSAL-thermostat-modes.md) — routed here
  // by suffix rather than by category.
  const modeSwitchSuffix = THERMOSTAT_MODE_SWITCHES.find((suffix) =>
    feature.external_id.endsWith(`:${suffix}`),
  );
  const isThermostatModeSwitch =
    THERMOSTAT_MODELS.includes(device.model) && Boolean(modeSwitchSuffix);
  const isThermostat = feature.category === DEVICE_FEATURE_CATEGORIES.THERMOSTAT;
  if (!transform || (!isCameraMonitoring && !isThermostat && !isThermostatModeSwitch)) {
    // Every other feature (boiler status, open window...) is read-only: a
    // command reaching it is a routing error, never something to forward.
    throw new Error(`Feature ${feature.external_id} is not writable`);
  }
  const homeId = getDeviceParam(device, PARAMS.HOME_ID);
  if (!homeId) {
    throw new Error(`Missing ${PARAMS.HOME_ID} param on ${device.external_id}`);
  }

  // Camera monitoring: setstate on the module itself, no room involved.
  if (isCameraMonitoring) {
    // `ext:<selector>:<netatmo id>` -> `<netatmo id>` (MAC with colons).
    const moduleId = device.external_id.replace(gladys.externalId(''), '');
    try {
      await client.setState({ homeId, moduleId, monitoring: transform(value) });
    } catch (err) {
      rethrowScopeError(err);
    }
    return;
  }

  const roomId = getDeviceParam(device, PARAMS.ROOM_ID);
  if (!roomId) {
    throw new Error(`Missing ${PARAMS.ROOM_ID} param on ${device.external_id}`);
  }

  // Frost guard / away switch: turning it ON sets that room mode, turning it
  // OFF hands the room back to its schedule (the only sane "undo" — Netatmo has
  // no "leave frost guard" command).
  if (isThermostatModeSwitch) {
    const mode =
      transform(value) === 'on'
        ? MODE_SWITCH_TO_SETPOINT_MODE[modeSwitchSuffix]
        : NETATMO_SETPOINT_MODE.SCHEDULE;
    try {
      await client.setRoomThermpoint({ homeId, roomId, mode });
    } catch (err) {
      rethrowScopeError(err);
    }
    return;
  }

  // Mode feature: a mode change carries no temperature.
  if (feature.type === DEVICE_FEATURE_TYPES.THERMOSTAT.MODE) {
    const mode = transform(value);
    if (!mode) {
      throw new Error(`Unsupported thermostat mode "${value}" for ${feature.external_id}`);
    }
    try {
      await client.setRoomThermpoint({ homeId, roomId, mode });
    } catch (err) {
      rethrowScopeError(err);
    }
    return;
  }

  try {
    await client.setRoomThermpoint({
      homeId,
      roomId,
      mode: NETATMO_SETPOINT_MODE.MANUAL,
      temp: transform(value),
    });
  } catch (err) {
    rethrowScopeError(err);
  }
}
