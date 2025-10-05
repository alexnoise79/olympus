const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node generate-crud.js <entityName> <fields>');
  console.error('Example: node generate-crud.js user "name:string,email:string,age:number"');
  process.exit(1);
}

const entityName = args[0];
const fieldsString = args[1];

// Parse fields
function parseFields(fieldsString) {
  return fieldsString.split(',').map(field => {
    const [name, type] = field.trim().split(':');
    const isOptional = type.includes('?');
    const cleanType = type.replace('?', '');
    
    let decorators = [];
    let finalType = cleanType;
    
    switch (cleanType.toLowerCase()) {
      case 'string':
        finalType = 'string';
        decorators.push('@Column()');
        break;
      case 'number':
        finalType = 'number';
        decorators.push('@Column({ type: "int" })');
        break;
      case 'boolean':
        finalType = 'boolean';
        decorators.push('@Column({ type: "boolean" })');
        break;
      case 'date':
        finalType = 'Date';
        decorators.push('@Column({ type: "timestamp" })');
        break;
      default:
        finalType = cleanType;
        decorators.push('@Column()');
    }
    
    if (isOptional) {
      decorators[0] = decorators[0].replace(')', ', { nullable: true })');
      // Fix the case where there's no initial options
      decorators[0] = decorators[0].replace('@Column(,', '@Column(');
    }
    
    return {
      name: name.trim(),
      type: finalType,
      isOptional,
      decorators
    };
  });
}

// Convert name to different cases
function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toSnakeCase(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

// Generate entity file
function generateEntity(entityName, fields) {
  const pascalCase = toPascalCase(entityName);
  const camelCase = toCamelCase(entityName);
  const snakeCase = toSnakeCase(pascalCase);
  
  let entityContent = `import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('${snakeCase}')
export class ${pascalCase} {
  @PrimaryGeneratedColumn()
  id: number;

`;
  
  fields.forEach(field => {
    entityContent += `  ${field.decorators.join('\n  ')}\n`;
    entityContent += `  ${field.name}: ${field.type}${field.isOptional ? ' | null' : ''};\n\n`;
  });
  
  entityContent += '}';
  
  return entityContent;
}

// Generate module file
function generateModule(entityName) {
  const pascalCase = toPascalCase(entityName);
  const camelCase = toCamelCase(entityName);
  
  return `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${pascalCase} } from './${entityName}.entity';
import { ${pascalCase}Service } from './${entityName}.service';
import { ${pascalCase}Controller } from './${entityName}.controller';

@Module({
  imports: [TypeOrmModule.forFeature([${pascalCase}])],
  controllers: [${pascalCase}Controller],
  providers: [${pascalCase}Service],
  exports: [${pascalCase}Service],
})
export class ${pascalCase}Module {}`;
}

// Generate service file
function generateService(entityName, fields) {
  const pascalCase = toPascalCase(entityName);
  const camelCase = toCamelCase(entityName);
  
  return `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${pascalCase} } from './${entityName}.entity';
import { Create${pascalCase}Dto } from './dto/create-${entityName}.dto';
import { Update${pascalCase}Dto } from './dto/update-${entityName}.dto';

@Injectable()
export class ${pascalCase}Service {
  constructor(
    @InjectRepository(${pascalCase})
    private readonly ${camelCase}Repository: Repository<${pascalCase}>,
  ) {}

  async create(create${pascalCase}Dto: Create${pascalCase}Dto): Promise<${pascalCase}> {
    const ${camelCase} = this.${camelCase}Repository.create(create${pascalCase}Dto);
    return this.${camelCase}Repository.save(${camelCase});
  }

  async findAll(): Promise<${pascalCase}[]> {
    return this.${camelCase}Repository.find();
  }

  async findOne(id: number): Promise<${pascalCase}> {
    return this.${camelCase}Repository.findOne({ where: { id } });
  }

  async update(id: number, update${pascalCase}Dto: Update${pascalCase}Dto): Promise<${pascalCase}> {
    await this.${camelCase}Repository.update(id, update${pascalCase}Dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.${camelCase}Repository.delete(id);
  }
}`;
}

// Generate controller file
function generateController(entityName) {
  const pascalCase = toPascalCase(entityName);
  const camelCase = toCamelCase(entityName);
  const snakeCase = toSnakeCase(pascalCase);
  
  return `import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ${pascalCase}Service } from './${entityName}.service';
import { Create${pascalCase}Dto } from './dto/create-${entityName}.dto';
import { Update${pascalCase}Dto } from './dto/update-${entityName}.dto';

@Controller('${snakeCase}')
export class ${pascalCase}Controller {
  constructor(private readonly ${camelCase}Service: ${pascalCase}Service) {}

  @Post()
  create(@Body() create${pascalCase}Dto: Create${pascalCase}Dto) {
    return this.${camelCase}Service.create(create${pascalCase}Dto);
  }

  @Get()
  findAll() {
    return this.${camelCase}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.${camelCase}Service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() update${pascalCase}Dto: Update${pascalCase}Dto,
  ) {
    return this.${camelCase}Service.update(id, update${pascalCase}Dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.${camelCase}Service.remove(id);
  }
}`;
}

// Generate DTO files
function generateCreateDto(entityName, fields) {
  const pascalCase = toPascalCase(entityName);
  
  const validationImports = new Set();
  fields.forEach(field => {
    if (!field.name.includes('id') && !field.isOptional) {
      validationImports.add('IsNotEmpty');
      if (field.type === 'number') validationImports.add('IsNumber');
      if (field.type === 'string') validationImports.add('IsString');
      if (field.type === 'boolean') validationImports.add('IsBoolean');
    }
  });
  
  let content = '';
  if (validationImports.size > 0) {
    content += `import { ${Array.from(validationImports).join(', ')} } from 'class-validator';\n\n`;
  }
  
  content += `export class Create${pascalCase}Dto {\n`;
  
  fields.forEach(field => {
    if (!field.name.includes('id')) {
      if (field.isOptional) {
        content += `  ${field.name}?: ${field.type};\n`;
      } else {
        content += `  @IsNotEmpty()`;
        if (field.type === 'number') content += `\n  @IsNumber()`;
        if (field.type === 'string') content += `\n  @IsString()`;
        if (field.type === 'boolean') content += `\n  @IsBoolean()`;
        content += `\n  ${field.name}: ${field.type};\n\n`;
      }
    }
  });
  
  content += '}';
  return content;
}

function generateUpdateDto(entityName) {
  const pascalCase = toPascalCase(entityName);
  
  return `import { PartialType } from '@nestjs/mapped-types';
import { Create${pascalCase}Dto } from './create-${entityName}.dto';

export class Update${pascalCase}Dto extends PartialType(Create${pascalCase}Dto) {}`;
}

// Generate Angular service file
function generateAngularService(entityName, fields) {
  const pascalCase = toPascalCase(entityName);
  const camelCase = toCamelCase(entityName);
  
  return `import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { I${pascalCase} } from '../models/${entityName}';

@Injectable({
  providedIn: 'root'
})
export class ${pascalCase}Service {
  private apiUrl = '/api/${camelCase}';
  private http = inject(HttpClient);

  getAll(): Observable<I${pascalCase}[]> {
    return this.http.get<I${pascalCase}[]>(this.apiUrl);
  }

  getById(id: number): Observable<I${pascalCase}> {
    return this.http.get<I${pascalCase}>(\`\${this.apiUrl}/\${id}\`);
  }

  create(${camelCase}: Omit<I${pascalCase}, 'id'>): Observable<I${pascalCase}> {
    return this.http.post<I${pascalCase}>(this.apiUrl, ${camelCase});
  }

  update(id: number, ${camelCase}: Partial<I${pascalCase}>): Observable<I${pascalCase}> {
    return this.http.patch<I${pascalCase}>(\`\${this.apiUrl}/\${id}\`, ${camelCase});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(\`\${this.apiUrl}/\${id}\`);
  }
}`;
}

// Generate interface file
function generateInterface(entityName, fields) {
  const pascalCase = toPascalCase(entityName);
  
  let interfaceContent = `export interface I${pascalCase} {
  id: number;

`;
  
  fields.forEach(field => {
    interfaceContent += `  ${field.name}: ${field.type}${field.isOptional ? ' | null' : ''};\n`;
  });
  
  interfaceContent += '}';
  
  return interfaceContent;
}

// Generate migration file
function generateMigration(entityName, fields) {
  const pascalCase = toPascalCase(entityName);
  const snakeCase = toSnakeCase(pascalCase);
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
  
  let migrationContent = `import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class Create${pascalCase}Table${timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: '${snakeCase}',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
`;
  
  fields.forEach(field => {
    if (!field.name.includes('id')) {
      let columnType = "'varchar'";
      if (field.type === 'number') columnType = "'int'";
      if (field.type === 'boolean') columnType = "'boolean'";
      if (field.type === 'Date') columnType = "'timestamp'";
      
      migrationContent += `          {
            name: '${field.name}',
            type: ${columnType},
            isNullable: ${field.isOptional ? 'true' : 'false'},
          },
`;
    }
  });
  
  migrationContent += `        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('${snakeCase}');
  }
}`;
  
  return { content: migrationContent, timestamp };
}

// Main execution
const fields = parseFields(fieldsString);
const targetPath = path.join('apps', 'zeus', 'src', 'app', entityName);
const migrationPath = path.join('apps', 'zeus', 'src', 'migrations');
const interfacePath = path.join('libs', 'olympus', 'core', 'src', 'lib', 'models');
const modelsIndexPath = path.join('libs', 'olympus', 'core', 'src', 'lib', 'models', 'index.ts');
const servicePath = path.join('libs', 'olympus', 'core', 'src', 'lib', 'services');
const servicesIndexPath = path.join('libs', 'olympus', 'core', 'src', 'lib', 'services', 'index.ts');

// Create directories
if (!fs.existsSync(targetPath)) {
  fs.mkdirSync(targetPath, { recursive: true });
}

if (!fs.existsSync(path.join(targetPath, 'dto'))) {
  fs.mkdirSync(path.join(targetPath, 'dto'), { recursive: true });
}

if (!fs.existsSync(migrationPath)) {
  fs.mkdirSync(migrationPath, { recursive: true });
}

if (!fs.existsSync(interfacePath)) {
  fs.mkdirSync(interfacePath, { recursive: true });
}

if (!fs.existsSync(servicePath)) {
  fs.mkdirSync(servicePath, { recursive: true });
}

// Generate files
fs.writeFileSync(path.join(targetPath, `${entityName}.entity.ts`), generateEntity(entityName, fields));
fs.writeFileSync(path.join(targetPath, `${entityName}.module.ts`), generateModule(entityName));
fs.writeFileSync(path.join(targetPath, `${entityName}.service.ts`), generateService(entityName, fields));
fs.writeFileSync(path.join(targetPath, `${entityName}.controller.ts`), generateController(entityName));
fs.writeFileSync(path.join(targetPath, 'dto', `create-${entityName}.dto.ts`), generateCreateDto(entityName, fields));
fs.writeFileSync(path.join(targetPath, 'dto', `update-${entityName}.dto.ts`), generateUpdateDto(entityName));

const migration = generateMigration(entityName, fields);
fs.writeFileSync(path.join(migrationPath, `${migration.timestamp}_create_${toSnakeCase(toPascalCase(entityName))}_table.ts`), migration.content);

// Generate interface
const pascalCase = toPascalCase(entityName);
const interfaceContent = generateInterface(entityName, fields);
fs.writeFileSync(path.join(interfacePath, `${entityName}.ts`), interfaceContent);

// Generate Angular service
const angularServiceContent = generateAngularService(entityName, fields);
fs.writeFileSync(path.join(servicePath, `${entityName}.service.ts`), angularServiceContent);

// Update models index file
let modelsIndexContent = '';
if (fs.existsSync(modelsIndexPath)) {
  modelsIndexContent = fs.readFileSync(modelsIndexPath, 'utf8');
}

// Check if export already exists
const exportLine = `export * from './${entityName}';`;
if (!modelsIndexContent.includes(exportLine)) {
  if (modelsIndexContent.trim() === '' || modelsIndexContent.trim() === '// Export all model interfaces here') {
    modelsIndexContent = exportLine + '\n';
  } else {
    modelsIndexContent += exportLine + '\n';
  }
  fs.writeFileSync(modelsIndexPath, modelsIndexContent);
}

// Update services index file
let servicesIndexContent = '';
if (fs.existsSync(servicesIndexPath)) {
  servicesIndexContent = fs.readFileSync(servicesIndexPath, 'utf8');
}

// Check if service export already exists
const serviceExportLine = `export * from './${entityName}.service';`;
if (!servicesIndexContent.includes(serviceExportLine)) {
  if (servicesIndexContent.trim() === '' || servicesIndexContent.trim() === '// Export all services here') {
    servicesIndexContent = serviceExportLine + '\n';
  } else {
    servicesIndexContent += serviceExportLine + '\n';
  }
  fs.writeFileSync(servicesIndexPath, servicesIndexContent);
}

console.log(`✅ CRUD resource '${entityName}' generated successfully!`);
console.log(`📁 Files created in: ${targetPath}`);
console.log(`🗃️ Migration created in: ${migrationPath}`);
console.log(`🔗 Interface created in: ${interfacePath}`);
console.log(`⚡ Angular service created in: ${servicePath}`);
console.log(`📝 Models index updated`);
console.log(`📝 Services index updated`);
