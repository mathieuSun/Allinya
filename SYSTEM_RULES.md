# SYSTEM RULES - ABSOLUTE TRUTHS

## RULE 1: CAMELCASE ONLY

All identifiers in this system MUST use camelCase. This is an absolute, unbreakable rule.

### What Must Be CamelCase:
- **Database column names**: All columns in all tables
- **API request fields**: All keys in request bodies, query params, and URL params
- **API response fields**: All keys in response objects
- **JavaScript/TypeScript variables**: All variable names
- **Function names**: All function and method names
- **Object properties**: All object keys and properties
- **Configuration keys**: All configuration object keys
- **Schema definitions**: All schema field names

### Valid Examples:
```javascript
// ✅ CORRECT
const userId = "123";
const isOnline = true;
const displayName = "John Doe";
const createdAt = new Date();
const practitionerId = "456";
```

### Invalid Examples:
```javascript
// ❌ WRONG - WILL BE REJECTED
const user_id = "123";        // Snake case
const is-online = true;       // Kebab case  
const display_name = "John";  // Snake case
const created-at = new Date(); // Kebab case
```

### Enforcement Mechanisms:

#### 1. Build-Time Enforcement
- **Schema Validation**: `shared/schemaUtils.ts` validates all schema definitions
- **TypeScript Types**: `shared/typeGuards.ts` makes snake_case impossible at type level
- **ESLint Rules**: Configured to error on non-camelCase identifiers
- **Build Script**: `npm run validate:schema` runs before every build

#### 2. Runtime Enforcement
- **Request Validation**: Middleware validates all incoming requests
- **Response Validation**: All API responses are validated before sending
- **Database Validation**: All database operations are intercepted and validated
- **Storage Guards**: Storage layer validates all data before persistence

#### 3. Database Enforcement
- **Column Validation**: All column names validated on table creation
- **Query Validation**: All queries validated before execution
- **Result Validation**: All query results validated before returning

## RULE 2: NO DUPLICATE COLUMNS

Database schema must not contain duplicate columns. Each piece of data has exactly one source of truth.

### Principles:
- **Single Source of Truth**: Each data field exists in exactly one place
- **No Redundancy**: No duplicate columns across or within tables
- **Clear Ownership**: Each table owns specific data domains
- **Explicit Relations**: Use foreign keys for relationships, not duplication

### Valid Examples:
```typescript
// ✅ CORRECT - Each field exists once
profiles: {
  id: uuid,
  displayName: text,
  avatarUrl: text
}

practitioners: {
  userId: uuid, // FK to profiles.id
  isOnline: boolean,
  rating: numeric
}
```

### Invalid Examples:
```typescript
// ❌ WRONG - Duplicate fields
profiles: {
  id: uuid,
  displayName: text,
  rating: numeric // Duplicate!
}

practitioners: {
  userId: uuid,
  displayName: text, // Duplicate!
  rating: numeric    // Should be here only
}
```

### Enforcement Mechanisms:

#### 1. Schema Utilities
- **Column Tracker**: Tracks all columns across all tables
- **Duplicate Detection**: Throws error on duplicate column names
- **Validation Report**: Provides full schema validation report

#### 2. Build-Time Validation
- **Schema Scanner**: Scans all table definitions for duplicates
- **Build Failure**: Build fails if duplicates are detected
- **CI/CD Integration**: Validation runs in CI pipeline

#### 3. Database Introspection
- **Runtime Checks**: Periodic checks of actual database schema
- **Alert System**: Alerts on any schema violations
- **Automatic Rollback**: Prevents deployment of violating schemas

## RULE 3: VALIDATION IS MANDATORY

All data entering or leaving the system MUST be validated.

### Validation Points:
1. **API Request Entry**: All incoming requests
2. **Database Operations**: All queries and mutations
3. **API Response Exit**: All outgoing responses
4. **Storage Operations**: All storage read/write operations
5. **Schema Definitions**: All schema changes

### Validation Failures:
- **Immediate Rejection**: Invalid data is rejected immediately
- **Clear Error Messages**: Specific error about what rule was violated
- **No Silent Failures**: All violations are logged and reported
- **Build Prevention**: Code with violations cannot be built or deployed

## IMPLEMENTATION GUIDE

### For Developers:

#### 1. Creating New Columns
Always use the validation utilities:
```typescript
import { createColumn } from '@shared/schemaUtils';

export const myTable = pgTable("myTable", {
  id: createColumn("myTable", "id", uuid().primaryKey()),
  userName: createColumn("myTable", "userName", text().notNull()),
  isActive: createColumn("myTable", "isActive", boolean().default(false))
});
```

#### 2. Handling API Data
All endpoints automatically validate:
```typescript
// This is automatic - middleware handles validation
app.post('/api/user', (req, res) => {
  // req.body is already validated for camelCase
  const { userId, userName } = req.body;
  // Response will be validated before sending
  res.json({ userId, userName, createdAt: new Date() });
});
```

#### 3. Database Operations
Storage layer validates automatically:
```typescript
// All operations are validated
await storage.createProfile({
  displayName: "John",  // ✅ camelCase
  avatarUrl: "...",    // ✅ camelCase
  // display_name: "John" // ❌ Would be rejected
});
```

### For System Administrators:

#### Running Validation
```bash
# Validate schema manually
npm run validate:schema

# Run full system validation
npm run validate:all

# Check validation report
npm run schema:report
```

#### Monitoring Violations
- Check logs for `SYSTEM RULE VIOLATION`
- Review validation reports in CI/CD
- Monitor error rates with code `CAMEL_CASE_VIOLATION`

### For New Team Members:

1. **Read This Document First**: These rules are absolute
2. **Use Validation Tools**: Always use provided utilities
3. **Never Bypass Validation**: No exceptions, no workarounds
4. **Ask If Unsure**: Better to ask than violate rules

## VIOLATION CONSEQUENCES

### Development Environment:
- **Immediate Error**: Code won't run with violations
- **Clear Feedback**: Specific error messages about violations
- **Cannot Commit**: Pre-commit hooks prevent violating code

### CI/CD Pipeline:
- **Build Failure**: Builds fail with violations
- **Blocked Deployment**: Cannot deploy violating code
- **Required Fix**: Must fix before proceeding

### Production Environment:
- **Request Rejection**: Invalid requests return 400 errors
- **Operation Prevention**: Invalid operations are blocked
- **Audit Trail**: All violations are logged for review

## FREQUENTLY ASKED QUESTIONS

### Q: What about external API integrations that use snake_case?
**A:** Transform at the boundary. Accept snake_case from external sources, immediately transform to camelCase for internal use.

### Q: What about database migrations from legacy systems?
**A:** Use migration utilities that transform during migration. Never allow snake_case into the new system.

### Q: Can I temporarily disable validation for debugging?
**A:** No. Validation is absolute. Debug with validation enabled to ensure production behavior.

### Q: What if a library requires snake_case?
**A:** Create an adapter layer that transforms between camelCase (internal) and snake_case (library).

### Q: How do I handle acronyms in camelCase?
**A:** Treat acronyms as words: `userId` not `userID`, `apiUrl` not `apiURL`, `htmlContent` not `HTMLContent`.

## APPENDIX: TRANSFORMATION UTILITIES

If you must interface with snake_case systems, use these utilities at the boundary only:

```typescript
import { transformToCamelCase, snakeToCamel } from '@shared/typeGuards';

// Transform external data at entry point only
const externalData = await fetchExternalAPI();
const internalData = transformToCamelCase(externalData);

// Use camelCase internally
processData(internalData);

// Transform back only if required by external system
const externalFormat = transformToSnakeCase(internalData);
await sendToExternalAPI(externalFormat);
```

Remember: These transformation utilities should ONLY be used at system boundaries, never internally.

---

**These rules are not suggestions. They are absolute requirements. Violation is not an option.**