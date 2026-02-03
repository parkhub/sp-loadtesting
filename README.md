# SP Load Testing

Load testing tools and scripts for performance testing.

## Purpose

This repository contains scripts, tools, and utilities for load testing activities including:
- Database seeding scripts
- Load test scenarios
- Performance testing utilities
- Test data generation

## Usage

_Documentation coming soon_

## Structure

_To be defined as tools are added_

## scripts

### stress_seed.sql
stress_seed.sql is intended to seed large quantities of listings, documentation for its config options can be found in the DECLARE section at the top of the script.

It uses a string `prefix` to identify all loadtest associated rows. It is highly recommended that you set it to something unique and easily matchable. (default is 'SEEDED_TEST')
*(this is important for the delete section of the script, the prefix is how previously seeded rows are identified and deleted before a new run for data hygiene)*
you can change it to run the script again without deleting previously seeded rows, or you can change it to a past "dirty" prefix and use `only_delete` to just run the delete section and clean out that prefix.

Several config options are required and are environment specific, at time of writing (1/29/2026) working values for QA & STG are defined and can be uncommented depending on needs.

The script runs in these steps:
1. all rows that may have been created via various pieces of our architecture related to the seeded listings (purchased passes, etc.) will be deleted
2. all rows directly seeded by the previous stress_seed.sql run will be deleted
3. `listing_count` listings will be created, each listing will consist of one unique lot, pricing, landmark, and event with no listings sharing any

##### **important**
be very careful with going above ~500 `listing_count`. Due to some slow indexing that is performed while the DELETE section runs, doing a large amount of listings can take a very long time to clear. 
For reference, a `listing_count` of 6k froze up egds-migration at the time and we had to wait 8 hours for the DELETE section to complete.
