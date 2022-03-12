# LMS Provider API

## Abstract

The LMS Provider API provides a standard interface for ClassFast to connect to
multiple learning management APIs. It abstracts a standard feature set, which
can be implemented through most LMS Oauth APIs. Multiple provider
implementations can be created and dynamically switched between, and it will
allow most of the codebase to deal with grading data in a platform-agnostic
way.

## Goals & Responsibilities

- Can be implemented for multiple providers
- Calls platform APIs only when needed; updates DB when necessary
- Can facilitate multiple sync types
  - `read_sync`: we read API data and update our DB
  - `write_sync`: we write data from our DB to platform API
- One management class coresponds to each DB model, which each relate to the
  data hierarchies for the application
  - Assignment
  - Submission
  - Comment
  - Teacher & Student\*

\* "teacher" and "student" are both just instances of `User`. Their roles are
defined in relation to a specific assignment, based on values in the
intermediary many to many table.

## Specification

### Optional Usage

In all cases, a caller may mutate the prisma model "normally", without going
through this API. The benefit to this API is that it implements code to
"automagically" transmit changes into the LMS API in addition to propogating
them to the database. Thus, code closer to the frontend does not need to be
concerned with when / how changes will be propogated to the LMS.

### `...attrs`

Used throughout the pseudocode interface below, `...attrs` needs to be typed
in more detail. Most simply, they will just be the exact same type as the
parameters acceptable for the underlying Prisma query.

```typescript
/**
 * In the database schema (../draw.io/schema.xml), these are the models inside
 * the green box labeled, "LMS Data." Each of these resources are stored in
 * our DB as described, but they also generally have corresponding resources
 * in the LMS, accessible via their API. This module manages that communication,
 * and the interfaces below can therefore wrap any of these types.
 */
type LMSDataModel = Submission | Comment | Teacher | Student | TeacherTemplate;

/**
 * `T` is a specific LMSDataModel, like `Student`.
 *
 * Each model manager class will deal with a specific one of the LMSDataModel
 * types.
 */
interface LMSModelManager<T extends LMSDataModel> {
  constructor(model: T): T;

  /**
   * Any model manager can facilitate creation. Although this is a "write"
   * operation, only *our* DB would be written to (which we can always do).
   *
   * Internally, we will reach out to the platform API to get the described
   * resource, then create the entity with relations as necessary in our DB.
   */
  static create(...attrs): T;
  static createMany(...attrs): T[];
}

/**
 * Wrappers for prisma read-related operations, where the API will queried as
 * necessary based on internal heuristics, or an API action can be forced.
 */
interface ReadableLMSPrismaManager extends LMSModelManager<T extends LMSDataModel> {
  findUnique(...attrs, forceApiAction = false): T;
  findFirst(...attrs, forceApiAction = false): T;
  findFirst(...attrs, forceApiAction = false): T[];
  count(...attrs, forceApiAction = false): number;
  aggregate(...attrs, forceApiAction = false): AggregateResult[];
  groupBy(...attrs, forceApiAction = false): T[];
}

/**
 * Similar to the above read wrapper, but for write operations. Some LMSs
 * (Google Classroom) have API features to enable reads but not writes via
 * their developer API, so we provide an alternative solution (below)
 */
interface WritableLMSPrismaManager extends LMSModelManager<T extends LMSDataModel> {
  /**
   * Write any pending changes to the LMS (ex. grades, comments). By default,
   * this action will just be put on a task queue.
   */
  syncChanges(queue = true): void;
  // also wrap Prisma's write methods:
  // - update(Many)
  // - delete(Many)
  // - upsert
}

/**
 * When a browser extension is the only way to write data into the final LMS,
 * write-like methods will return the sentinel value 'EXTENSION_REQUIRED'.
 *
 * This sends a signal that the caller can access EXTENSION_INSTALL_URL if
 * they wish to provide that for the end user.
 */
interface ExtensionWritableLMSPrismaManager extends LMSModelManager {
  readonly EXTENSION_INSTALL_URL: string;

  // ... all write-like methods return the above sentinel value
  // - createMany
  // - update
  // - updateMany
  // - delete
  // - deleteMany
  // - upsert
}
```
