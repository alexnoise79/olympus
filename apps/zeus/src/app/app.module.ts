import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres', // O il tuo database (mysql, sqlite, etc.)
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'noise_79',
      database: 'postgres',
      entities: [],
      synchronize: true, // Solo in sviluppo, NON in produzione!
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
