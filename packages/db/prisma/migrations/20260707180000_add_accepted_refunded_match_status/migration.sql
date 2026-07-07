-- Owner resolutions for unmatched transfers that never bind to a payer:
-- 'accepted' keeps the money without attribution, 'refunded' records that it
-- was returned to the sender outside Paybook.
ALTER TYPE "MatchStatus" ADD VALUE 'accepted' BEFORE 'disputed';
ALTER TYPE "MatchStatus" ADD VALUE 'refunded' BEFORE 'disputed';
