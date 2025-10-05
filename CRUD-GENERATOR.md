# CRUD Generator for Zeus Backend

This project includes a custom CRUD generator that creates complete scaffolding for TypeORM entities, services, interfaces, and migrations.

## Usage

### Method 1: NPM Script (Recommended)
```bash
npm run generate:crud <entity-name> "<fields>"
```

### Method 2: Direct Node Script
```bash
node scripts/generate-crud.js <entity-name> "<fields>"
```

## Examples

### Generate User Entity
```bash
npm run generate:crud user "name:string,email:string,age:number"
```

### Generate Product Entity
```bash
npm run generate:crud product "name:string,description:string,price:number,isActive:boolean"
```

### Generate Category Entity with Optional Fields
```bash
npm run generate:crud category "name:string,description?:string,parentId?:string"
```

## Field Types Supported

- `string` - varchar column
- `number` - numeric column  
- `boolean` - boolean column
- `date` - timestamp column
- `uuid` - uuid column
- `text` - text column
- `int` - int column
- `float` - float column
- `decimal` - decimal column

## Generated Files

For each entity, the generator creates:

1. **Interface File** (`<entity>.interface.ts`)
   - Main entity interface (`I<Entity>`)
   - CreateDto interface (`Create<Entity>Dto`)
   - UpdateDto interface (`Update<Entity>Dto`)

2. **Service File** (`<entity>.service.ts`)
   - Complete CRUD service with methods:
     - `create()`
     - `findAll()`
     - `findOne()`
     - `update()`
     - `remove()`

3. **Controller File** (`<entity>.controller.ts`)
   - Complete REST API controller with endpoints:
     - `POST /<entity>s` - Create new entity
     - `GET /<entity>s` - Get all entities
     - `GET /<entity>s/:id` - Get entity by ID
     - `PUT /<entity>s/:id` - Update entity
     - `DELETE /<entity>s/:id` - Delete entity

4. **Entity File** (`<entity>.entity.ts`)
   - TypeORM entity with decorators
   - Column definitions
   - Timestamps (createdAt, updatedAt)

5. **Migration File** (`migrations/Create<Entity>Table<timestamp>.ts`)
   - TypeORM migration for creating the database table

6. **Updated index.ts**
   - Exports all generated files

## File Locations

All files are generated in `libs/olympus/core/src/lib/`:
- Interfaces: `libs/olympus/core/src/lib/<entity>.interface.ts`
- Services: `libs/olympus/core/src/lib/<entity>.service.ts`
- Controllers: `libs/olympus/core/src/lib/<entity>.controller.ts`
- Entities: `libs/olympus/core/src/lib/<entity>.entity.ts`
- Migrations: `libs/olympus/core/src/lib/migrations/`

## Integration with Zeus

After generating the CRUD scaffolding:

1. **Import the generated files** in your Zeus app module:
   ```typescript
   import { User, UserService, UserController, IUser } from '@olympus/core';
   
   @Module({
     imports: [
       TypeOrmModule.forFeature([User])
     ],
     providers: [UserService],
     controllers: [UserController]
   })
   export class UserModule {}
   ```

2. **The controller is already generated** with all CRUD endpoints:
   - `POST /users` - Create new user
   - `GET /users` - Get all users
   - `GET /users/:id` - Get user by ID
   - `PUT /users/:id` - Update user
   - `DELETE /users/:id` - Delete user

3. **Run the migration**:
   ```bash
   npx typeorm migration:run -d your-datasource-config
   ```

## Tips

- Use optional fields by adding `?` to the field name: `description?:string`
- All entities automatically include `id`, `createdAt`, and `updatedAt` fields
- The generator uses UUID for primary keys
- Generated services include proper TypeORM repository injection
- All interfaces are properly typed with TypeScript
- **Interface naming**: Main interfaces are prefixed with `I` (e.g., `IUser`) to avoid naming conflicts with entity classes
