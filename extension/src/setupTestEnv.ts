/**
 * Copyright (C) 2022 John DeVries
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
