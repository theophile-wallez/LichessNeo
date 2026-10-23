"""Step 2 of the Game Review's game rating calibration: fits, on extract.py's
output, how often a player of each rating loses how much win% on a move, and
writes it into src/page/review/rating/model.json.

Needs numpy and scipy:

  python3 tools/game-rating/fit.py moves.jsonl && pnpm format

The model, per speed: a move falls in one of the review's loss bands (best,
excellent, good, inaccuracy, mistake, blunder), with odds that depend on the
player's rating, the phase the move was played in (opening, tactics,
strategy, endgame) and whether the mover was lost, level or winning (in a
won position even a big blunder costs little win%). A game's moves make a
likelihood over the level it was played at, and that level is drawn around
the player's rating, with a width (tau) fitted on held-out games: the
posterior's mean is the game rating. Moves played in a game already lost for
good don't count: weaker players play on to the mate where stronger ones
resign, so the easy best moves played there would read as a weak player's.
Without a rating (an anonymous player), the population is the prior.
src/page/review/rating/model.ts reads it.
"""

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from scipy.optimize import minimize

MODEL_PATH = Path(__file__).resolve().parents[2] / 'src/page/review/rating/model.json'
SPEEDS = ['bullet', 'blitz', 'rapid', 'classical']
SPEED_OF = {
    'ultraBullet': 'bullet',
    'bullet': 'bullet',
    'blitz': 'blitz',
    'rapid': 'rapid',
    'classical': 'classical',
    'correspondence': 'classical',
}
PHASES = 'otse'  # opening, tactics, strategy, endgame
STANDINGS = 3  # lost, level, winning
CONTEXTS = len(PHASES) * STANDINGS
LOSS_BANDS = [0.5, 2, 5, 10, 20]  # the review's, in src/page/review/rating/rate-game.ts
BANDS = len(LOSS_BANDS) + 1
FEATURES = 3  # 1, x and x², in x = (rating - 1500) / 500
LOW, HIGH = -1.6, 2.2  # x's range for the quadratic, linear beyond
GRID = np.arange(100, 3201, 10)  # the ratings the posterior is computed at
TAUS = range(50, 1001, 25)
MIN_MOVES = 5  # counted, for a player-game to count
LOST_FOR_GOOD = 2  # the mover's win% under which a move isn't counted
RATING_BIN = 50
# The phase verdicts, from best to blunder: shares of all phases played.
VERDICT_SHARES = [0.10, 0.20, 0.35, 0.20, 0.10]


def counted(move):
    """Whether a move says something of the player's level: out of the book, and
    not in a game already lost for good. rate-game.ts counts the same."""
    _, before, phase = move
    return phase != 'k' and before >= LOST_FOR_GOOD


def band(loss):
    return next((i for i, limit in enumerate(LOSS_BANDS) if loss < limit), len(LOSS_BANDS))


def standing(before):
    return 0 if before < 20 else 2 if before > 80 else 1


def context(phase, before):
    return PHASES.index(phase) * STANDINGS + standing(before)


def features(ratings):
    x = np.asarray((ratings - 1500) / 500, dtype=float)
    square = np.where(
        x < LOW,
        LOW * LOW + 2 * LOW * (x - LOW),
        np.where(x > HIGH, HIGH * HIGH + 2 * HIGH * (x - HIGH), x * x),
    )
    return np.stack([np.ones_like(x), x, square], axis=-1)


def log_softmax(logits, axis):
    peak = logits.max(axis=axis, keepdims=True)
    return logits - peak - np.log(np.exp(logits - peak).sum(axis=axis, keepdims=True))


def fit_context(counts):
    """One context's theta (BANDS - 1 × FEATURES), from {rating: moves per
    band}: a multinomial logit on the rating, band 0 the reference, with
    a unit Gaussian prior on theta."""
    ratings = np.array(sorted(counts))
    observed = np.array([counts[rating] for rating in ratings], dtype=float)
    design = features(ratings)

    def cost_and_gradient(flat):
        theta = flat.reshape(BANDS - 1, FEATURES)
        logits = np.concatenate([np.zeros((len(ratings), 1)), design @ theta.T], axis=1)
        log_p = log_softmax(logits, axis=1)
        p = np.exp(log_p)
        gradient = (p[:, 1:] * observed.sum(axis=1, keepdims=True) - observed[:, 1:]).T @ design
        return -(observed * log_p).sum() + 0.5 * (theta**2).sum(), (gradient + theta).ravel()

    start = np.zeros((BANDS - 1) * FEATURES)
    fit = minimize(cost_and_gradient, start, jac=True, method='L-BFGS-B')
    return fit.x.reshape(BANDS - 1, FEATURES)


def grid_log_p(theta):
    """theta (CONTEXTS × BANDS - 1 × FEATURES) -> log p of each band at each
    rating of GRID: (CONTEXTS × len(GRID) × BANDS)."""
    odds = np.einsum('gf,ckf->cgk', features(GRID), theta)
    return log_softmax(np.concatenate([np.zeros((CONTEXTS, len(GRID), 1)), odds], axis=2), axis=2)


def game_log_likelihood(log_p, moves, phases=PHASES):
    """At each rating of GRID, from the moves played in `phases`."""
    total = np.zeros(len(GRID))
    for loss, before, phase in filter(counted, moves):
        if phase in phases:
            total += log_p[context(phase, before), :, band(loss)]
    return total


def estimate(log_likelihood, mu, sd):
    """The posterior's mean over GRID, with a normal prior of mean mu and deviation sd."""
    posterior = log_likelihood - 0.5 * ((GRID - mu) / sd) ** 2
    weights = np.exp(posterior - posterior.max())
    return (weights * GRID).sum() / weights.sum()


def load_player_games(path):
    """extract.py's player-games by speed, those with enough moves counted."""
    by_speed = defaultdict(list)
    with Path(path).open() as file:
        for line in file:
            game = json.loads(line)
            speed = SPEED_OF.get(game['s'])
            if speed and sum(map(counted, game['m'])) >= MIN_MOVES:
                by_speed[speed].append(game)
    return by_speed


def band_counts(games):
    """Per context, the moves in each band by rating, to the nearest RATING_BIN."""
    counts = [defaultdict(lambda: [0] * BANDS) for _ in range(CONTEXTS)]
    for game in games:
        rating = round(game['r'] / RATING_BIN) * RATING_BIN
        for loss, before, phase in filter(counted, game['m']):
            counts[context(phase, before)][rating][band(loss)] += 1
    return counts


def held_out_fit(log_likelihoods, ratings, tau):
    """The held-out games' log-likelihood, their levels drawn around their
    players' ratings with a width of tau."""
    prior = -0.5 * ((GRID[None, :] - ratings[:, None]) / tau) ** 2
    prior -= np.log(np.exp(prior).sum(axis=1, keepdims=True))
    return sum(
        np.logaddexp.reduce(likelihood + level)
        for likelihood, level in zip(log_likelihoods, prior, strict=True)
    )


def phase_pulls(log_p, games, tau):
    """Per phase, how far each game's moves in that phase alone put the
    estimate off the player's rating."""
    pulls = {phase: [] for phase in PHASES}
    for game in games:
        for phase in PHASES:
            if any(counted(move) and move[2] == phase for move in game['m']):
                log_likelihood = game_log_likelihood(log_p, game['m'], phase)
                pulls[phase].append(estimate(log_likelihood, game['r'], tau) - game['r'])
    return pulls


def fit_speed(speed, games, rng):
    """A speed's model, fitted on four fifths of its games and checked on the
    rest, and a line that says how well it does."""
    rng.shuffle(games)
    test, train = games[: len(games) // 5], games[len(games) // 5 :]
    theta = np.array([fit_context(counts) for counts in band_counts(train)])
    log_p = grid_log_p(theta)
    train_ratings = np.array([game['r'] for game in train])
    mu, sd = train_ratings.mean(), train_ratings.std()
    log_likelihoods = [game_log_likelihood(log_p, game['m']) for game in test]
    test_ratings = np.array([game['r'] for game in test])
    tau = max(TAUS, key=lambda width: held_out_fit(log_likelihoods, test_ratings, width))
    # With the player's own rating as the prior: the spread of the estimates.
    errors = np.array(
        [
            estimate(log_likelihood, game['r'], tau) - game['r']
            for log_likelihood, game in zip(log_likelihoods, test, strict=True)
        ]
    )
    # Without a rating the population is the prior: how well the estimate
    # then tells the players' ratings.
    unrated = np.array(
        [estimate(log_likelihood, mu, math.hypot(sd, tau)) for log_likelihood in log_likelihoods]
    )
    report = (
        f'{speed}: {len(games)} player-games, tau {tau}, '
        f'unrated r {np.corrcoef(unrated, test_ratings)[0, 1]:.2f}, '
        f'estimate - rating: sd {errors.std():.0f}, '
        f'5-95% {np.percentile(errors, 5):.0f} .. {np.percentile(errors, 95):.0f}'
    )
    model = {'theta': theta, 'tau': tau, 'mu': mu, 'sd': sd, 'pulls': phase_pulls(log_p, test, tau)}
    return model, report


def verdict_cuts(models):
    """Per phase, the pulls that split all phases played into VERDICT_SHARES."""
    shares = np.cumsum(VERDICT_SHARES)
    cuts = {}
    for phase in PHASES:
        pulls = np.concatenate([models[speed]['pulls'][phase] for speed in SPEEDS])
        cuts[phase] = [round(float(np.percentile(pulls, 100 * (1 - share)))) for share in shares]
    return cuts


def rounded(values):
    return [round(float(value), 3) for value in values]


def model_json(models, cuts):
    """The model as model.ts reads it, compact: `pnpm format` lays it out."""
    model = {
        'pop': {
            speed: [round(models[speed]['mu']), round(models[speed]['sd'])] for speed in SPEEDS
        },
        'tau': {speed: models[speed]['tau'] for speed in SPEEDS},
        'cuts': cuts,
        'theta': {
            speed: [[rounded(odds) for odds in theta] for theta in models[speed]['theta']]
            for speed in SPEEDS
        },
    }
    return json.dumps(model, separators=(',', ':')) + '\n'


def main(path):
    games = load_player_games(path)
    rng = np.random.default_rng(1)
    models, report = {}, []
    for speed in SPEEDS:
        models[speed], line = fit_speed(speed, games[speed], rng)
        report.append(line)
    cuts = verdict_cuts(models)
    print('\n'.join('// ' + line for line in report), file=sys.stderr)
    MODEL_PATH.write_text(model_json(models, cuts))


if __name__ == '__main__':
    main(sys.argv[1])
