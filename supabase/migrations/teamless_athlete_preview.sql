-- Allow athletes to complete their survey and receive a preview blueprint
-- before joining a team. team_id is now optional on both tables.

-- survey_responses: team_id becomes nullable so athletes can submit without a team
ALTER TABLE survey_responses ALTER COLUMN team_id DROP NOT NULL;

-- blueprints: coach_id becomes nullable so auto-generated preview blueprints
-- can be created without a coach when the athlete has no team yet
ALTER TABLE blueprints ALTER COLUMN coach_id DROP NOT NULL;
