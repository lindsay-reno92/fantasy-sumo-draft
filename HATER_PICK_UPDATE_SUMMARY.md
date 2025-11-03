# Hater Pick Update Summary

## Overview
Changed the hater pick functionality so that it **counts as one of the 6 rikishi** instead of being an additional pick.

**Previous behavior:** Users could select 6 regular rikishi + 1 hater pick = 7 total
**New behavior:** Users can select up to 6 rikishi total, with the hater pick counting as 1 of the 6

## Files Modified

### Backend Changes

1. **lib/supabase.js**
   - Updated `getDraftStatus()` to include hater pick in the `selectedCount`
   - Now returns: `selectedCount = selectedRikishi.length + (haterPick ? 1 : 0)`
   - Updated `getRikishiWithSelections()` to include `isHaterPick` flag for each rikishi

2. **api/draft/hater-pick.js**
   - Added validation to prevent selecting a hater pick if user already has 6 rikishi
   - Added check to prevent selecting a rikishi as hater pick if they're already in regular draft
   - Fixed cost calculation to account for swapping hater picks

3. **api/draft/select/[rikishiId].js**
   - Updated max selection validation to include hater pick in the count
   - Added check to prevent selecting a rikishi as regular pick if they're already the hater pick
   - Updated error message to clarify hater pick is included in the 6 rikishi limit

4. **api/draft/finalize.js**
   - Updated to use `MAX_RIKISHI_SELECTIONS` constant from config
   - Updated to use `DRAFT_BUDGET` constant from config
   - Enforces exactly 6 rikishi (including hater pick) before allowing finalization

5. **api/draft/all-finalized.js**
   - Updated `rikishiCount` calculation to include hater pick: `rikishi.length + (haterPick ? 1 : 0)`

### Frontend Changes

6. **client/src/components/DraftInterface.tsx**
   - Updated "Your Team" header to show total count including hater pick
   - Added "(Hater Pick)" label next to hater pick name in selected summary
   - Updated hater pick button description to clarify it counts as 1 of 6 rikishi

7. **client/src/components/HaterPickModal.tsx**
   - Updated modal description to clarify hater pick counts as 1 of the 6 rikishi

8. **client/src/components/AllDraftsView.tsx**
   - Updated `isRikishiSelectedByUser()` to check hater picks
   - Updated `getRikishiPopularity()` to include hater picks in popularity count
   - Updated `getAllUniqueRikishi()` to include hater picks in the unique list

## Key Changes Summary

### Validation Logic
- Users cannot select a 7th rikishi if they have a hater pick
- Users cannot select a hater pick if they already have 6 regular picks (must deselect one first)
- Users cannot have the same rikishi as both a regular pick and a hater pick
- Draft finalization now requires exactly 6 rikishi total (including hater pick)

### UI Updates
- All counters now correctly show 6/6 when user has 5 regular + 1 hater
- Clear messaging that hater pick counts toward the 6 rikishi limit
- Hater pick is visually distinguished in the selected team list
- Draft comparison view correctly counts and displays hater picks

### Point Budget
- Hater pick cost still comes from the same 140-point budget
- Swapping hater picks correctly adjusts points (old cost refunded, new cost charged)

## Testing Checklist

- [ ] User with 5 regular picks can add a hater pick
- [ ] User with 6 regular picks cannot add a hater pick without deselecting one first
- [ ] User cannot select same rikishi as both regular and hater pick
- [ ] User with 5 regular + 1 hater can finalize (total = 6)
- [ ] User with 5 regular picks cannot finalize (total < 6)
- [ ] Draft comparison view shows correct counts including hater picks
- [ ] Point budget correctly includes hater pick cost
- [ ] Swapping hater picks correctly updates points

## Migration Notes

**No database migration required** - The database schema already supports this change. Only the validation logic and display logic needed to be updated.

Existing drafts with 6 regular + 1 hater (7 total) will continue to work, but new selections will enforce the 6 total limit.

