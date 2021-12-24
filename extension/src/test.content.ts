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
