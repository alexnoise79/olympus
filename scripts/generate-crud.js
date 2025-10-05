#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Get command line arguments
const args = process.argv.slice(2);
const entityName = args[0];
const fieldsString = args[1] || 'name:string,description:string';

if (!entityName) {
  console.error('Usage: node generate-crud.js <entity-name> [fields]');
  console.error('Example: node generate-crud.js user "name:string,email:string,age:number"');
  process.exit(1);
}

// Parse fields
function parseFields(fieldsString) {
  return fieldsString.split(',').map(field => {
    const [name, type] = field.trim().split(':');
    const isOptional = name.includes('?');
    return {
      name: name.replace('?', ''),
      type: type || 'string',
      isOptional
    };
  });
}

// Convert types
function getTypeScriptType(type) {
  const typeMap = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    date: 'Date',
    uuid: 'string',
    text: 'string',
    int: 'number',
    float: 'number',
    decimal: 'number'
  };
  return typeMap[type.toLowerCase()] || 'string';
}

function getTypeORMType(type) {
  const typeMap = {
    string: 'varchar',
    number: 'numeric',
    boolean: 'boolean',
    date: 'timestamp',
    uuid: 'uuid',
    text: 'text',
    int: 'int',
    float: 'float',
    decimal: 'decimal'
  };
  return typeMap[type.toLowerCase()] || 'varchar';
}

// Convert entity name to different formats
function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Generate files
const fields = parseFields(fieldsString);
const entityPascal = toPascalCase(entityName);
const entityCamel = toCamelCase(entityName);

const directory = 'libs/olympus/core/src/lib';

// Ensure directory exists
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory, { recursive: true });
}

if (!fs.existsSync(path.join(directory, 'migrations'))) {
  fs.mkdirSync(path.join(directory, 'migrations'), { recursive: true });
}

// Generate interface
const interfaceContent = `export interface ${entityPascal} {
  id: string;
${fields.map(field => 
  `  ${field.name}${field.isOptional ? '?' : ''}: ${getTypeScriptType(field.type)};`
).join('\n')}
  createdAt: Date;
  updatedAt: Date;
}

export interface Create${entityPascal}Dto {
${fields.map(field => 
  `  ${field.name}${field.isOptional ? '?' : ''}: ${getTypeScriptType(field.type)};`
).join('\n')}
}

export interface Update${entityPascal}Dto {
${fields.map(field => 
  `  ${field.name}${field.isOptional ? '?' : ''}: ${getTypeScriptType(field.type)};`
).join('\n')}
}
`;

// Generate service
const serviceContent = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ${entityPascal}, Create${entityPascal}Dto, Update${entityPascal}Dto } from './${entityName}.interface';

@Injectable()
export class ${entityPascal}Service {
  constructor(
    @InjectRepository(${entityPascal})
    private readonly ${entityCamel}Repository: Repository<${entityPascal}>,
  ) {}

  async create(createDto: Create${entityPascal}Dto): Promise<${entityPascal}> {
    const ${entityCamel} = this.${entityCamel}Repository.create(createDto);
    return await this.${entityCamel}Repository.save(${entityCamel});
  }

  async findAll(): Promise<${entityPascal}[]> {
    return await this.${entityCamel}Repository.find();
  }

  async findOne(id: string): Promise<${entityPascal} | null> {
    return await this.${entityCamel}Repository.findOne({ where: { id } });
  }

  async update(id: string, updateDto: Update${entityPascal}Dto): Promise<${entityPascal} | null> {
    await this.${entityCamel}Repository.update(id, updateDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.${entityCamel}Repository.delete(id);
  }
}
`;

// Generate entity
const entityContent = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('${entityCamel}s')
export class ${entityPascal} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

${fields.map(field => 
  `  @Column({ type: '${getTypeORMType(field.type)}', nullable: ${field.isOptional} })
  ${field.name}${field.isOptional ? '?' : ''}: ${getTypeScriptType(field.type)};`
).join('\n')}

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
`;

// Generate controller
const controllerContent = `import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ${entityPascal}Service } from './${entityName}.service';
import { Create${entityPascal}Dto, Update${entityPascal}Dto } from './${entityName}.interface';

@Controller('${entityCamel}s')
export class ${entityPascal}Controller {
  constructor(private readonly ${entityCamel}Service: ${entityPascal}Service) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() create${entityPascal}Dto: Create${entityPascal}Dto) {
    return this.${entityCamel}Service.create(create${entityPascal}Dto);
  }

  @Get()
  findAll() {
    return this.${entityCamel}Service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.${entityCamel}Service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() update${entityPascal}Dto: Update${entityPascal}Dto) {
    return this.${entityCamel}Service.update(id, update${entityPascal}Dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.${entityCamel}Service.remove(id);
  }
}
`;

// Generate migration
const timestamp = Date.now();
const migrationContent = `import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class Create${entityPascal}Table${timestamp} implements MigrationInterface {
  name = 'Create${entityPascal}Table${timestamp}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: '${entityCamel}s',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
${fields.map(field => 
          `          {
            name: '${field.name}',
            type: '${getTypeORMType(field.type)}',
            isNullable: ${field.isOptional},
          },`
).join('\n')}
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('${entityCamel}s');
  }
}
`;

// Write files
fs.writeFileSync(path.join(directory, `${entityName}.interface.ts`), interfaceContent);
fs.writeFileSync(path.join(directory, `${entityName}.service.ts`), serviceContent);
fs.writeFileSync(path.join(directory, `${entityName}.entity.ts`), entityContent);
fs.writeFileSync(path.join(directory, `${entityName}.controller.ts`), controllerContent);
fs.writeFileSync(path.join(directory, 'migrations', `Create${entityPascal}Table${timestamp}.ts`), migrationContent);

// Update index.ts
const indexPath = path.join(directory, '../index.ts');
let indexContent = '';
if (fs.existsSync(indexPath)) {
  indexContent = fs.readFileSync(indexPath, 'utf-8');
}

const exports = [
  `export * from './lib/${entityName}.interface';`,
  `export * from './lib/${entityName}.service';`,
  `export * from './lib/${entityName}.entity';`,
  `export * from './lib/${entityName}.controller';`
];

exports.forEach(exportLine => {
  if (!indexContent.includes(exportLine)) {
    indexContent += `\n${exportLine}`;
  }
});

fs.writeFileSync(indexPath, indexContent);

console.log(`✅ Generated CRUD scaffolding for ${entityName}`);
console.log(`📁 Files created:`);
console.log(`   - ${entityName}.interface.ts`);
console.log(`   - ${entityName}.service.ts`);
console.log(`   - ${entityName}.entity.ts`);
console.log(`   - ${entityName}.controller.ts`);
console.log(`   - migrations/Create${entityPascal}Table${timestamp}.ts`);
console.log(`📝 Updated index.ts`);
