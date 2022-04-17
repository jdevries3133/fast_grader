import "@testing-library/jest-dom";

import { getMockTabQueryFunc } from "./testUtils";

export const chromeMocks = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
    getPlatformInfo: jest.fn(),
  },
  storage: {
    sync: {
      set: jest.fn(),
      get: jest.fn(),
    },
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn().mockImplementation(getMockTabQueryFunc()),
    update: jest.fn(),
  },
  windows: {
    update: jest.fn(),
  },
  extension: {
    getBackgroundPage: jest.fn().mockImplementation(() => false),
  },
};

global.chrome = chromeMocks as any as typeof chrome;

export const fetchMock = jest.fn();
global.fetch = fetchMock;
