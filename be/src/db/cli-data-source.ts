import 'reflect-metadata';
import { config } from '../config/config';
import { createDataSource } from './data-source';

/**
 * DataSource instance for the TypeORM CLI (migration:generate / revert / show).
 * The app itself builds its DataSource via createDataSource(); this default export
 * is only the CLI's entry point.
 */
export default createDataSource({ database: config.DATABASE_PATH });
