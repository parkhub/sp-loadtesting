-- This psql script seeds the target database with listings, it can easily be adjusted for multiple kinds of listings 
-- and to seed in batches for the desired quantity of listings. This can create a single listing for convenience, 
-- but it is intended to cleanly create massive batches of them for stress testing purposes.

-- Note that this can easily take 1-3 minutes or more to run, some parts of the DELETE section are very slow due to indexing.

DO $$
DECLARE
   -- declare UUIDs generated per-iteration
   event_id uuid;
   landmark_id uuid;
   lot_id uuid;
   pricing_id uuid;
   external_source_landmark_lot_id uuid;
   distribution_group_id uuid;
   access_code_id uuid;

   -- inventory set for all lots, pricings, etc.
   -- if this exceeds 1,000,000 you'll need to bump the digit count in the access code generation `LPAD`
   inventory integer := 20;

   -- listing_count defines how many listings are created
   -- if this exceeds 1,000,000 you'll need to bump the digit count in the various `LPAD`s in this script.
   listing_count integer := 6000;

   -- pricing_type, change this depending on product type.
   eventpass_pricing_type pricing_types := 'presell_event';
   pricing_type pricing_types := eventpass_pricing_type;

   -- all "name" columns begin with the "prefix" text defined here. Set this to something unique and easily searchable.
   -- NOTE: the DELETE section uses this, so it won't clear out the results of a previous seeding if you change prefix.
   prefix text := 'SEEDED_TEST';
   prefix_ac text := 'SEEDEDTEST'; -- access codes only allow alphanumerics, so they need their own prefix.
   prefix_slug text := 'seededtest'; -- slugs also need their own prefix
   only_delete boolean := false; -- enable this if you only want to run the delete section, to cleanup a previous prefix.

   -- seasonpass_listing, change this to true if you want a seasonpass listing.
   seasonpass_listing boolean := true;

   -- set payment account 
   payment_account_id uuid := gen_random_uuid();

   -- per env 

   -- QA
   smartpass_source uuid := '8241da0d-83e3-4f5a-a64a-378d0fa04673';
   acct text := 'acct_1PF0MRGhMg3SJrgB'; -- already existing payment account
   op_user_id uuid := '43b2b424-5cd1-4ea8-a0b2-14326dfa86a4'; -- operator user ID used for event_options rows & pricing (use generic operator)
   ck uuid := '78b146d8-1dac-4786-a1c0-b03d4ae0edfb';

   -- -- STG
   -- smartpass_source uuid := '4605ad53-f9b4-4183-b8ec-aedc59901de9';
   -- acct text := 'acct_1PxBob2fhSMqnA5e'; -- already existing payment account
   -- op_user_id uuid := '1c845ab0-54a5-4087-be93-2138602fdda5'; -- operator user ID used for event_options rows & pricing (use generic operator)
   -- ck uuid := '208a53a3-ef9f-4e78-9f4f-c74f0c7abb9a';
BEGIN 
   -- nuke anything related to event/landmark/lot/pricings starting with prefix
   DELETE FROM smartpass.events_lots_config elc WHERE elc.event_id IN (
      SELECT id FROM public.events WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.pricing_config pc WHERE pc.pricing_id IN (
      SELECT id FROM public.pricings WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.lot_config lc WHERE lc.lot_id IN (
      SELECT id FROM public.lots WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.event_config ec WHERE ec.event_id IN (
      SELECT id FROM public.events WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.landmark_config lc WHERE lc.landmark_id IN (
      SELECT id FROM public.landmarks WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.landmarks_lots lalo WHERE lalo.landmark_id IN (
      SELECT id FROM public.landmarks WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.event_options eo WHERE eo.event_id IN (
      SELECT id FROM public.events WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.events_pricings ep WHERE ep.event_id IN (
      SELECT id FROM public.events WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.external_lots_landmarks elola WHERE elola.lot_id IN (
      SELECT id FROM public.lots WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.external_events ee WHERE ee.event_id IN (
      SELECT id FROM public.events WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.external_sources_landmarks esl WHERE esl.landmark_id IN (
      SELECT id FROM public.landmarks WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.url_slug us WHERE us.landmark_id IN (
      SELECT id FROM public.landmarks WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.egds_barcodes eb WHERE eb.lot_id IN (
      SELECT id FROM public.lots WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.landmark_lot_distance lld WHERE lld.lot_id IN (
      SELECT id FROM public.lots WHERE name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.transfers trn WHERE trn.transaction_id IN (
      SELECT
         txn.id
      FROM smartpass.transaction txn 
      WHERE txn.destination_account_id IN (
         SELECT
            pa.id
         FROM smartpass.payment_accounts pa 
         WHERE pa.name ILIKE prefix || '%'
      )
   );

   DELETE FROM smartpass.transaction txn
   WHERE
      txn.destination_account_id IN (
         SELECT
            pa.id
         FROM smartpass.payment_accounts pa 
         WHERE pa.name ILIKE prefix || '%'
      )
      OR txn.pass_id IN (
         SELECT 
            p.id
         FROM public.events e
            JOIN smartpass.pass p ON p.event_id=e.id
         WHERE e.name ILIKE prefix || '%'
      );

   DELETE FROM public.external_transactions etxn WHERE etxn.lot_id IN (
      SELECT
         l.id
      FROM public.lots l 
      WHERE l.name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.pending_transactions ptxns WHERE ptxns.pricing_id IN (
      SELECT id FROM public.pricings WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.transactions txn WHERE txn.pricing_id IN (
      SELECT
         p.id
      FROM public.pricings p 
      WHERE p.name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.passes_lots pl
   WHERE pl.pass_id IN (
      SELECT 
         p.id 
      FROM smartpass.pass p
      WHERE 
         p.pricing_id IN (
            SELECT id FROM public.pricings WHERE name ILIKE prefix || '%'
         ) 
         OR p.event_id IN (
            SELECT id FROM public.events WHERE name ILIKE prefix || '%'
         )
   );

   DELETE FROM smartpass.pass p
   WHERE 
      p.pricing_id IN (
         SELECT id FROM public.pricings WHERE name ILIKE prefix || '%'
      ) 
      OR p.event_id IN (
         SELECT id FROM public.events WHERE name ILIKE prefix || '%'
      );

   DELETE FROM smartpass.distribution_groups_events dge WHERE dge.distribution_group_id IN (
      SELECT 
         dg.id 
      FROM smartpass.distribution_groups dg
      WHERE dg.name ILIKE 'SEEDED_TEST' || '%'
   );

   DELETE FROM smartpass.distribution_groups_lots dgl WHERE dgl.distribution_group_id IN (
      SELECT 
         dg.id 
      FROM smartpass.distribution_groups dg
      WHERE dg.name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.distribution_groups_lots_pricings dglp WHERE dglp.distribution_group_id IN (
      SELECT 
         dg.id 
      FROM smartpass.distribution_groups dg
      WHERE dg.name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.single_use_access_codes suac WHERE suac.distribution_group_id IN (
      SELECT 
         dg.id 
      FROM smartpass.distribution_groups dg
      WHERE dg.name ILIKE prefix || '%'
   );

   DELETE FROM smartpass.google_wallet_classes gwc WHERE gwc.event_id IN (
      SELECT id FROM public.events WHERE name ILIKE prefix || '%'
   );

   DELETE FROM public.events e WHERE e.name ILIKE prefix || '%';
   DELETE FROM public.lots l WHERE l.name ILIKE prefix || '%';
   DELETE FROM public.landmarks la WHERE la.name ILIKE prefix || '%';
   DELETE FROM public.pricings p WHERE p.name ILIKE prefix || '%';
   DELETE FROM smartpass.payment_accounts pa WHERE pa.name ILIKE prefix || '%';
   DELETE FROM smartpass.distribution_groups dg WHERE dg.name ILIKE prefix || '%';

   IF NOT only_delete THEN
      -- if seasonpass_listing is enabled pricing_type needs to be 'presell_package'
      IF seasonpass_listing THEN 
         pricing_type := 'presell_package';
      END IF;

      -- generate individual listings each iteration, each with their own event, landmark, lot, and pricing.
      FOR i IN 1..listing_count LOOP
         -- gen random IDs for this iter 
         event_id := gen_random_uuid();
         landmark_id := gen_random_uuid();
         lot_id := gen_random_uuid();
         pricing_id := gen_random_uuid();
         external_source_landmark_lot_id := gen_random_uuid();
         distribution_group_id := gen_random_uuid();

         -- seed records

         -- landmarks and only landmarks dependent records
         INSERT INTO public.landmarks (id, name, address1, timezone_id, country, slug, location, city, state, zip, region_id, live)
         VALUES (
            landmark_id,
            prefix || ' LANDMARK 0x' || LPAD(i::text, 9, '0'),
            'K6 LOAD AVE.',
            'America/Chicago',
            'US',
            prefix_slug || '-lm-0x' || LPAD(i::text, 9, '0'),
            '{"lat":41.947304,"lon":-87.656447}',
            'Chicago',
            'IL',
            '60613',
            'a71b833e-4d9d-456f-8263-96f4c741981b', -- might need sm else in other envs
            true
         );

         INSERT INTO smartpass.landmark_config (landmark_id, client_org_key)
         VALUES (
            landmark_id,
            ck
         );

         INSERT INTO public.external_sources_landmarks(id, landmark_id, external_source_id)
         VALUES (
            external_source_landmark_lot_id,
            landmark_id,
            smartpass_source -- "smartpass" source
         );

         INSERT INTO smartpass.url_slug(landmark_id, client_org_key, slug)
         VALUES (
            landmark_id,
            ck,
            prefix_slug || '-lm-0x' || LPAD(i::text, 9, '0')
         );

         -- lots and landmark + lot dependent records
         INSERT INTO public.lots (id, name, address1, city, state, zip, total_spots, directions, information, live, slug, location, presell, default_presell_spots)
         VALUES (
            lot_id,
            prefix || ' LOT 0x' || LPAD(i::text, 9, '0'),
            'K6 LOAD AVE.',
            'Chicago',
            'IL',
            '60007',
            inventory,
            'SEEDED TESTING LOT',
            'DONT USE THIS PROBABLY',
            true,
            prefix_slug || '-lot-0x' || LPAD(i::text, 9, '0'), 
            '{"lat":41.947304,"lon":-87.656447}',
            true,
            inventory
         );

         INSERT INTO smartpass.lot_config (lot_id, client_org_key, default_presell_spots)
         VALUES (
            lot_id,
            ck,
            inventory
         );

         INSERT INTO public.external_lots_landmarks(external_sources_landmark_id, lot_id, external_lot_id)
         VALUES (
            external_source_landmark_lot_id,
            lot_id,
            payment_account_id
         );


         INSERT INTO public.landmarks_lots (landmark_id, lot_id)
         VALUES (
            landmark_id,
            lot_id
         );

         -- event and landmark + lot + event dependent records
         INSERT INTO public.events(id, name, "from", "to", parking_from, parking_to, presell_from, presell_to, live, slug, landmark_id) 
         VALUES (
            event_id,
            prefix || ' EVENT 0x' || LPAD(i::text, 9, '0'),
            CURRENT_TIMESTAMP - (20 ||' days')::interval,
            CURRENT_TIMESTAMP + (20 ||' days')::interval,
            CURRENT_TIMESTAMP - (20 ||' days')::interval,
            CURRENT_TIMESTAMP + (20 ||' days')::interval,
            CURRENT_TIMESTAMP - (20 ||' days')::interval,
            CURRENT_TIMESTAMP + (20 ||' days')::interval,
            true, 
            prefix_slug || '-ev-0x' || LPAD(i::text, 9, '0'),
            landmark_id
         );

         INSERT INTO smartpass.events_lots_config (event_id, lot_id, presell_inventory)
         VALUES (
            event_id,
            lot_id,
            inventory
         );

         INSERT INTO public.event_options (event_id, lots_sellable, user_id)
         VALUES (
            event_id,
            ARRAY[lot_id],
            op_user_id
         );

         INSERT INTO smartpass.event_config (event_id, client_org_key)
         VALUES (
            event_id,
            ck
         );

         -- add pricings stuff last since it has the longest dependency chain
         INSERT INTO public.pricings (id, name, price, types, lot_id, user_id, default_presell_spots)
         VALUES (
            pricing_id,
            prefix || ' PRICING 0x' || LPAD(i::text, 9, '0'),
            1000,
            pricing_type, 
            lot_id,
            op_user_id,
            inventory
         );


         INSERT INTO smartpass.events_pricings (event_id, pricing_id)
         VALUES (
            event_id,
            pricing_id
         );

         INSERT INTO smartpass.pricing_config (pricing_id)
         VALUES (
            pricing_id
         );

         -- SeP stuf
         IF seasonpass_listing THEN 
            INSERT INTO smartpass.distribution_groups (id, name, type, client_org_key, presell_from, presell_to, access_code, single_use_access_code)
            VALUES (
               distribution_group_id,
               prefix || ' SeP DG ' || LPAD(i::text, 9, '0'),
               'LISTING',
               ck,
               CURRENT_TIMESTAMP - (20 ||' days')::interval,
               CURRENT_TIMESTAMP + (20 ||' days')::interval,

               -- access code cols. Use these to control whether the created listing will have no access code, single AC, or multiple single-use ACs.
               NULL, 
               true
            );

            INSERT INTO smartpass.distribution_groups_events (distribution_group_id, event_id)
            VALUES (
               distribution_group_id,
               event_id
            );

            INSERT INTO smartpass.distribution_groups_lots (distribution_group_id, lot_id)
            VALUES (
               distribution_group_id,
               lot_id
            );

            INSERT INTO smartpass.distribution_groups_lots_pricings (distribution_group_id, lot_id, pricing_id, presell_spots)
            VALUES (
               distribution_group_id,
               lot_id,
               pricing_id,
               inventory
            );

            -- adjust this for however many access codes you'd like
            FOR j IN 1..inventory LOOP
               access_code_id := gen_random_uuid();

               INSERT INTO smartpass.single_use_access_codes (id, access_code, distribution_group_id, is_used) 
               VALUES (
                  access_code_id,
                  prefix_ac || 'DG' || LPAD(i::text, 9, '0') || 'AC' || LPAD(j::text, 9, '0'),
                  distribution_group_id,
                  false
               );
            END LOOP;
         END IF;

      END LOOP; 

      INSERT INTO smartpass.payment_accounts (id, external_account_id, external_account_provider, client_org_key, name)
      VALUES (
         payment_account_id,
         acct,
         'stripe',
         ck,
         prefix || ' PAYMENT ACCT'
      );
   END IF;
END $$;
