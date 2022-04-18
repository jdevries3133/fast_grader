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

import { exportedForTesting } from "./content";
import { logToBackend } from "./api";

const { getParentTable, getRows, parseRow } = exportedForTesting;
import mockPage from "./mockClassroomPage";

jest.mock("./util");
jest.mock("./api");

beforeEach(() => {
  jest.useFakeTimers();
  document.body.innerHTML = mockPage;
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getParentTable", () => {
  const getMockTable = () => {
    const el = document.createElement("table");
    el.setAttribute("aria-label", "Students");
    return el;
  };

  const insertTables = (nTables: number) => {
    Array(nTables)
      .fill(null)
      .forEach(() => {
        document.body.appendChild(getMockTable());
      });
  };

  it("finds the table", async () => {
    document.body.innerHTML = "";
    insertTables(1);
    const res = await getParentTable().catch((e) => {
      throw new Error(e);
    });
    expect(res).toContainHTML('<table aria-label="Students>');
  });

  it("retries if the table is missing at first", async () => {
    document.body.innerHTML = "";
    jest.useRealTimers();

    // call fn without awaiting
    const futureRes = getParentTable();

    // maybe a bit flaky and timing-dependent? not sure
    insertTables(1);
    const res = await futureRes;
    expect(res).toContainHTML('<table aria-label="Students>');

    jest.useFakeTimers();
  });

  it("resolves to an error and logs the error if there are too many tables", async () => {
    document.body.innerHTML = "";
    insertTables(3);
    await expect(getParentTable()).rejects.toThrow();
  });

  it("stops recursing after 5 tries, and throws an error", async () => {
    document.body.innerHTML = "";

    await expect(getParentTable()).rejects.toThrow();
    expect(logToBackend).toHaveBeenCalledWith("failed to get parent table");
  });
});

test("getRows: filters out useless data and only provides relevant rows", async () => {
  const parent = await getParentTable();
  const rows = await getRows(parent);

  // in the sameple data, all the "students" have my name
  rows.forEach((row) => {
    expect(row.innerHTML).toContain("Jack DeVries");
  });
});

test("parseRow: returns an object with a name, profilePhotoUrl, and gradeInput", async () => {
  const parent = await getParentTable();
  const rows = await getRows(parent);

  rows.forEach(async (row) => {
    const result = parseRow(row);
    expect(result).toMatchObject({
      name: expect.any(String),
      profilePhotoUrl: expect.stringMatching(/googleusercontent.com/),
      gradeInput: expect.any(Element),
    });
  });
});
