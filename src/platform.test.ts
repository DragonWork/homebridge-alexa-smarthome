/* eslint-disable @typescript-eslint/no-explicit-any */
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as hapNodeJs from 'hap-nodejs';
import type { API } from 'homebridge';
import { ValidationError } from './domain/homebridge/errors';
import { AlexaSmartHomePlatform } from './platform';
import { AlexaApiWrapper } from './wrapper/alexa-api-wrapper';

jest.mock('./wrapper/alexa-api-wrapper.ts');
const alexaApiMocks = AlexaApiWrapper as jest.MockedClass<
  typeof AlexaApiWrapper
>;

test('should not initialize devices with invalid ids', async () => {
  // given
  const platform = getPlatform();
  const device = {
    id: '123',
    displayName: 'test light',
    description: 'test',
    supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
    providerData: {
      enabled: true,
      categoryType: 'APPLIANCE',
      deviceType: 'LIGHT',
    },
  };

  // when
  const actual = platform.initAccessories(device)();

  // then
  expect(actual).toStrictEqual(
    E.left(
      new ValidationError('id: \'123\' is not a valid Smart Home device id'),
    ),
  );
});

describe('findDevices', () => {
  test('should match Alexa account devices with filter', async () => {
    // given
    const platform = getPlatform();
    (platform as any).config.devices = [' Samson’s Light  '];
    (platform as any).alexaApi = new AlexaApiWrapper(
      platform.alexaRemote,
      platform.log,
      platform.deviceStore,
    );
    const device = {
      id: '123',
      displayName: 'Samson’s Light',
      description: 'test',
      supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
      providerData: {
        enabled: true,
        categoryType: 'APPLIANCE',
        deviceType: 'LIGHT',
      },
    };
    const mockApi = getMockedAlexaApi();
    mockApi.getDevices.mockReturnValueOnce(TE.of([device]));

    // when
    const actual = platform.findDevices()();

    // then
    expect(actual).resolves.toStrictEqual(E.of([device]));
  });

  test('should include all devices when filter empty', async () => {
    // given
    const platform = getPlatform();
    (platform as any).config.devices = undefined;
    (platform as any).alexaApi = new AlexaApiWrapper(
      platform.alexaRemote,
      platform.log,
      platform.deviceStore,
    );
    const device = {
      id: '123',
      displayName: 'test light',
      description: 'test',
      supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
      providerData: {
        enabled: true,
        categoryType: 'APPLIANCE',
        deviceType: 'LIGHT',
      },
    };
    const mockApi = getMockedAlexaApi();
    mockApi.getDevices.mockReturnValueOnce(TE.of([device]));

    // when
    const actual = platform.findDevices()();

    // then
    expect(actual).resolves.toStrictEqual(E.of([device]));
  });

  test('should not match groups', async () => {
    // given
    const platform = getPlatform();
    (platform as any).config.devices = ['test light'];
    (platform as any).alexaApi = new AlexaApiWrapper(
      platform.alexaRemote,
      platform.log,
      platform.deviceStore,
    );
    const device = {
      id: '123',
      displayName: 'test light',
      description: 'test',
      supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
      providerData: {
        enabled: true,
        categoryType: 'GROUP',
        deviceType: 'LIGHT',
      },
    };
    const mockApi = getMockedAlexaApi();
    mockApi.getDevices.mockReturnValueOnce(TE.of([device]));

    // when
    const actual = platform.findDevices()();

    // then
    expect(actual).resolves.toStrictEqual(
      E.left(
        new ValidationError(
          'No Alexa devices configured. Shutting down plugin',
        ),
      ),
    );
  });

  test('should return error if no devices matched settings filter', async () => {
    // given
    const platform = getPlatform();
    (platform as any).config.devices = ['some other light'];
    (platform as any).alexaApi = new AlexaApiWrapper(
      platform.alexaRemote,
      platform.log,
      platform.deviceStore,
    );
    const device = {
      id: '123',
      displayName: 'test light',
      description: 'test',
      supportedOperations: ['turnOff', 'turnOn', 'setBrightness'],
      providerData: {
        enabled: true,
        categoryType: 'APPLIANCE',
        deviceType: 'LIGHT',
      },
    };
    const mockApi = getMockedAlexaApi();
    mockApi.getDevices.mockReturnValueOnce(TE.of([device]));

    // when
    const actual = platform.findDevices()();

    // then
    expect(actual).resolves.toStrictEqual(
      E.left(
        new ValidationError(
          'No Alexa devices configured. Shutting down plugin',
        ),
      ),
    );
  });
});

function getPlatform(): AlexaSmartHomePlatform {
  return new AlexaSmartHomePlatform(
    global.MockLogger,
    global.createPlatformConfig(),
    getApi(),
  );
}

function getApi(): API {
  return {
    hap: {
      Service: hapNodeJs.Service,
      Characteristic: hapNodeJs.Characteristic,
    },
    on: () => ({}),
    user: { persistPath: () => '.' },
  } as unknown as API;
}

function getMockedAlexaApi(): jest.Mocked<AlexaApiWrapper> {
  const mock = alexaApiMocks.mock.instances[0] as jest.Mocked<AlexaApiWrapper>;
  return mock;
}
