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

import { runtimeMessage } from "./chromeWrappers";
import {
  BackgroundMessageTypes,
  RuntimeMsg,
  getTokenMsg,
  getNewTokenMsg,
  performSyncMsg,
} from "./messaging";

jest.mock("./chromeWrappers");

describe("messaging methods", () => {
  test("getTokenMsg", async () => {
    await getTokenMsg();
    expect(runtimeMessage).toHaveBeenCalledWith({ kind: 0 });
  });
  test("getNewTokenMsg", async () => {
    await getNewTokenMsg();
    expect(runtimeMessage).toHaveBeenCalledWith({ kind: 1 });
  });
  test("performSyncMsg", async () => {
    const expectedMsg: RuntimeMsg = {
      kind: BackgroundMessageTypes.PERFORM_SYNC,
      payload: { pk: "23" },
    };
    await performSyncMsg(expectedMsg.payload.pk);
    expect(runtimeMessage).toHaveBeenCalledWith({
      kind: 2,
      payload: { pk: "23" },
    });
  });
});
