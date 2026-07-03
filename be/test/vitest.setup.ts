// Inversify + TypeORM decorators need the metadata reflection polyfill loaded
// once before any decorated class is evaluated.
import 'reflect-metadata';
