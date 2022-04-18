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

import { exportedForTesting } from "./popup";
import { getEvent } from "./testUtils";

import { performSyncMsg as _ps } from "./messaging";
const _ps_tmp = <any>_ps;
const performSyncMsg = <jest.MockedFunction<typeof _ps>>_ps_tmp;

const { syncRequestHandler } = exportedForTesting;

jest.mock("./messaging", () => {
  const orig = jest.requireActual("./messaging");
  return {
    ...orig,
    performSyncMsg: jest.fn(),
  };
});

test("syncRequestHandler calls performSync with data-pk value", () => {
  [
    "2",
    "3",
    // does not validate that data-pk is number-like, or pass it through
    // parseInt
    "foobar",
  ].forEach((value) => {
    syncRequestHandler(getEvent({ "data-pk": value }));
    expect(performSyncMsg).toHaveBeenCalledWith(value);
  });
});

test("syncRequestHandler calls syncFailed if arg is not an element", () => {
  const evt = <Event>(<unknown>{
    target: "not an element",
  });
  syncRequestHandler(evt);
  const el = document.querySelector("#failMsg");
  expect(el).toHaveTextContent("Sync failed. Please try again");
});
