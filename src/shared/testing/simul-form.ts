// The simul form (/simul/new) as lila serves it, its option lists cut short, with the
// visible copy flatpickr adds after the start time's hidden field.

const variant = (index: number, value: string, name: string, checked = false): string =>
  `<div class="checkable"><span class="form-check__input"><input id="setup-variants-${index}" name="variants[${index}]" value="${value}" type="checkbox"${checked ? ' checked' : ''}><label class="form-check__label" for="setup-variants-${index}"></label></span><label for="setup-variants-${index}">${name}</label></div>`;

const VARIANTS = [
  variant(0, '1', 'Standard', true),
  variant(1, '10', 'Crazyhouse'),
  variant(2, '2', 'Chess960'),
  variant(6, '7', 'Atomic'),
].join('');

const GAMES = `<fieldset class="toggle-box"><legend>Games</legend>
  <div class="form-group form-full"><label class="form-label" for="form3-variant">If you select several variants, each player gets to choose which one to play.</label><div class="variants">${VARIANTS}</div></div>
  <div class="form-split">
    <div class="form-group form-half position"><label class="form-label" for="form3-position">Starting position</label><input id="form3-position" name="position" class="form-control"><small class="form-help">Paste a valid FEN to start every game from a given position.<br>You can use the <a href="/editor" target="_blank">Board editor</a> to generate a FEN position, then paste it here.</small></div>
    <div class="form-group form-half"><label class="form-label" for="form3-color">Host color for each game</label><select name="color" class="form-control" id="form3-color"><option value="white" selected>White</option><option value="random">Random</option><option value="black">Black</option></select></div>
  </div>
</fieldset>`;

const CLOCK = `<fieldset class="toggle-box"><legend>Clock</legend><p>The more players you take on, the more time you may need.</p>
  <div class="form-split">
    <div class="form-group form-half"><label class="form-label" for="form3-clockTime">Clock initial time</label><select name="clockTime" class="form-control" id="form3-clockTime"><option value="5">5 minutes</option><option value="20" selected>20 minutes</option><option value="30">30 minutes</option></select></div>
    <div class="form-group form-half"><label class="form-label" for="form3-clockIncrement">Clock increment</label><select name="clockIncrement" class="form-control" id="form3-clockIncrement"><option value="0">0 seconds</option><option value="60" selected>60 seconds</option></select></div>
  </div>
  <div class="form-split">
    <div class="form-group form-half"><label class="form-label" for="form3-clockExtra">Extra clock time for the host:</label><select name="clockExtra" class="form-control" id="form3-clockExtra"><option value="-10">-10 minutes</option><option value="0" selected>0 minutes</option><option value="10">+10 minutes</option></select><small class="form-help">You may add extra initial time to your clock to help you cope with the simul.</small></div>
    <div class="form-group form-half"><label class="form-label" for="form3-clockExtraPerPlayer">Host extra clock time per player</label><select name="clockExtraPerPlayer" class="form-control" id="form3-clockExtraPerPlayer"><option value="0" selected>0 seconds</option><option value="30">30 seconds</option></select><small class="form-help">Add initial time to your clock for each player joining the simul.</small></div>
  </div>
</fieldset>`;

const ENTRY = `<fieldset class="toggle-box"><legend>Entry conditions</legend>
  <div class="form-split">
    <div class="form-group form-half"><label class="form-label" for="form3-conditions_team_teamId">Only members of team</label><select name="conditions.team.teamId" class="form-control" id="form3-conditions_team_teamId"><option value="">No restriction</option><option value="chess-club">Chess Club</option></select></div>
    <div class="form-group form-half"><label class="form-label" for="form3-conditions_accountAge">Minimum account age</label><select name="conditions.accountAge" class="form-control" id="form3-conditions_accountAge"><option value="">No restriction</option><option value="7">7 days</option></select></div>
  </div>
  <div class="form-split">
    <div class="form-group form-half"><label class="form-label" for="form3-conditions_maxRating_rating">Maximum weekly rating</label><select name="conditions.maxRating.rating" class="form-control" id="form3-conditions_maxRating_rating"><option value="">No restriction</option><option value="2000">Maximum rating of 2000</option></select></div>
  </div>
</fieldset>`;

export const SIMUL_FORM = `<main class="box box-pad page-small simul-form"><h1 class="box__top">Host a new simul</h1>
<form method="post" class="form3" action="/simul/new"><br><p>Creating a simul lets you play against multiple opponents at the same time.</p><br><br>
  <div class="form-group form-full"><label class="form-label" for="form3-name">Name</label><div><input id="form3-name" name="name" value="Ada" class="form-control" minlength="2" maxlength="40"> Simul<br><small class="form-help">Anything even slightly inappropriate could get your account closed.</small></div></div>
  ${GAMES}${CLOCK}${ENTRY}
  <div class="form-split"><div class="form-group form-half"><label class="form-label" for="form3-estimatedStartAt">Estimated start time</label><input id="form3-estimatedStartAt" name="estimatedStartAt" class="form-control flatpickr flatpickr-input" type="hidden"><input class="form-control flatpickr form-control input" type="text" readonly></div></div>
  <div class="form-group form-full"><label class="form-label" for="form3-text">Simul description</label><textarea id="form3-text" name="text" class="form-control" rows="10"></textarea></div>
  <div class="form-actions"><a href="/simul">Cancel</a><button type="submit" data-icon="&#xe048;" class="submit button text">Host a new simul</button></div>
</form></main>`;
