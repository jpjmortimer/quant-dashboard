import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WikiPage() {
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Wiki</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Candles
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Candles</h4>
              <p>
                Each candlestick represents the price action for a fixed time
                period (e.g., 1 minute). The <strong>candle body</strong> shows
                where price opened and closed. The <strong>wicks</strong> show
                the highest and lowest prices reached. Green means the price{" "}
                <strong>closed higher</strong> than it opened; red means it{" "}
                <strong>closed lower</strong>.
              </p>
              <p>Why traders use this:</p>
              <ul>
                <li>
                  To quickly understand market direction (uptrend vs downtrend).
                </li>
                <li>
                  To spot reversal patterns such as wicks showing rejection of
                  prices.
                </li>
                <li>
                  To identify volatility — long wicks and big bodies mean strong
                  movement.
                </li>
                <li>
                  To see where momentum is building (strong green) or weakening
                  (small bodies).
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Close Line
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Close Line</h4>
              <p>
                This line connects the <strong>closing price</strong> of each
                candle. It provides a smoother view of the market by reducing
                the “noise” inside each candle’s open–high–low–close movement.
              </p>
              <p>Why traders use this:</p>
              <ul>
                <li>
                  To see the underlying trend without distraction from wick
                  spikes.
                </li>
                <li>
                  To compare price direction versus indicators such as moving
                  averages.
                </li>
                <li>
                  To highlight breakouts above/below important closing levels.
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Volume
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Volume</h4>
              <p>
                The volume bars show how many units were traded in each candle
                (e.g., how much BTC changed hands). High volume means strong
                interest or strong pressure. Low volume means fewer participants
                and weaker conviction.
              </p>
              <p>Why traders use this:</p>
              <ul>
                <li>
                  To confirm moves — strong price moves with strong volume are
                  more reliable.
                </li>
                <li>
                  To spot potential reversals when volume suddenly spikes.
                </li>
                <li>
                  To detect fakeouts: a price breakout on low volume is often
                  weak or manipulated.
                </li>
                <li>
                  To time entries — increased volume often precedes large moves.
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              MA20 (20-period Moving Average)
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>MA20 (20-period Moving Average)</h4>
              <p>
                MA20 is the average closing price of the last 20 candles. As
                each new candle arrives, the oldest one drops out of the
                calculation and the newest one is added. This creates a smooth
                line that follows the general direction of price.
              </p>
              <p>
                <strong>Why traders use this:</strong>
              </p>
              <ul>
                <li>
                  To see the underlying trend (price above MA20 = bullish bias,
                  below = bearish bias).
                </li>
                <li>
                  To filter noise – it smooths out short-term spikes and wicks.
                </li>
                <li>
                  To use as dynamic support/resistance (price often reacts
                  around the MA20 line).
                </li>
                <li>
                  To build strategies such as MA crossovers (e.g. fast MA
                  crossing slow MA).
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              EMA20 (20-period Exponential MA)
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>EMA20 (20-period Exponential Moving Average)</h4>
              <p>
                EMA20 is a moving average that gives{" "}
                <strong>more weight to recent prices</strong> and less weight to
                older ones. Unlike the simple MA20 (which treats all 20 candles
                equally), EMA reacts faster to changes in price. This makes it
                more sensitive to momentum and short-term trend shifts.
              </p>
              <p>
                EMA20 is calculated by combining today’s closing price with
                yesterday’s EMA value using an exponential smoothing factor:
              </p>
              <p style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
                EMA<sub>today</sub> = (Close × k) + (EMA<sub>yesterday</sub> ×
                (1 − k)), where k = 2 / (20 + 1)
              </p>
              <p>
                <strong>Why traders use this:</strong>
              </p>
              <ul>
                <li>
                  To detect trend changes earlier than MA20 — EMA responds
                  faster to sharp moves.
                </li>
                <li>
                  To gauge short-term momentum, especially in fast-moving
                  markets like crypto.
                </li>
                <li>
                  To build crossover strategies, e.g. EMA8 crossing EMA20 for
                  momentum signals.
                </li>
                <li>
                  To see dynamic support/resistance levels that price often
                  “rides” during trends.
                </li>
                <li>
                  To smooth price action without lagging as much as simple
                  moving averages.
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Bollinger Bands
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Bollinger Bands</h4>
              <p>
                Bollinger Bands are built around a moving average (usually 20
                periods) and show how volatile the market is. The{" "}
                <strong>middle band</strong> is the moving average. The{" "}
                <strong>upper band</strong> is the moving average plus a
                multiple of the standard deviation (often 2×), and the{" "}
                <strong>lower band</strong> is the moving average minus that
                same amount.
              </p>
              <p>
                When price is quiet, the bands contract. When the market becomes
                volatile, the bands expand.
              </p>
              <p>
                <strong>Why traders use this:</strong>
              </p>
              <ul>
                <li>
                  To see when the market is quiet (narrow bands) vs explosive
                  (wide bands).
                </li>
                <li>
                  To spot potential overextensions when price pushes outside or
                  hugs a band.
                </li>
                <li>
                  To build mean-reversion ideas (price snapping back towards the
                  middle band).
                </li>
                <li>
                  To combine with volume: strong moves outside the bands on high
                  volume can signal genuine breakouts.
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              RSI 14 (Relative Strength Index)
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>RSI 14 (Relative Strength Index)</h4>
              <p>
                RSI 14 is a <strong>momentum oscillator</strong> that measures
                how strong recent up-moves are versus down-moves over the last
                14 candles. It outputs a value between{" "}
                <strong>0 and 100</strong>, and on this chart it’s shown in a
                separate lower panel as a cyan line.
              </p>
              <p>
                Traditionally, values above <strong>70</strong> are considered
                “overbought” (strong bullish move that may be stretched), and
                values below <strong>30</strong> are considered “oversold”
                (strong bearish move that may be stretched). RSI doesn’t tell
                you the direction of the trend — it tells you how strong the
                recent move has been.
              </p>
              <p>
                <strong>Why traders use this:</strong>
              </p>
              <ul>
                <li>
                  To gauge momentum: is the current move strong or fading?
                </li>
                <li>
                  To spot potential reversal zones when RSI reaches extreme
                  levels (e.g. near 70 or 30).
                </li>
                <li>
                  To look for <strong>divergence</strong> — when price makes a
                  new high but RSI makes a lower high, or vice versa, hinting at
                  a weakening move.
                </li>
                <li>
                  To filter trades: only buy when RSI is recovering from
                  oversold, or only short when RSI is rolling over from
                  overbought (depending on the strategy).
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Crosshair (Hover Inspector)
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Crosshair (Hover Inspector)</h4>
              <p>
                The crosshair is an interactive cursor that lets you inspect any
                exact point on the chart. When you move your mouse over the
                chart, the crosshair locks onto a specific candle and displays
                the precise values for that moment in time:{" "}
                <strong>open</strong>, <strong>high</strong>,{" "}
                <strong>low</strong>, <strong>close</strong>,{" "}
                <strong>volume</strong>, and any indicators such as MA20, EMA20,
                Bollinger Bands, or RSI 14.
              </p>
              <p>
                The crosshair helps you analyse historical points with accuracy,
                instead of trying to visually estimate the values of a candle or
                indicator line.
              </p>

              <p>
                <strong>Why traders use this:</strong>
              </p>
              <ul>
                <li>
                  To see the exact OHLC values of any candle — essential for
                  precise analysis or backtesting.
                </li>
                <li>
                  To read indicator values (MA20, EMA20, Bollinger Bands, RSI
                  14, etc.) at the exact candle where they were calculated.
                </li>
                <li>
                  To inspect how price reacted to support/resistance, moving
                  averages, or volatility expansions.
                </li>
                <li>
                  To compare multiple indicators at the same timestamp without
                  guessing.
                </li>
                <li>
                  To do bar-by-bar analysis — a key skill in professional
                  technical trading.
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Buy / Sell Markers
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Buy / Sell Markers</h4>
              <p>
                Buy/sell markers are arrows drawn directly on the chart to
                highlight where a simple strategy would have entered or exited a
                trade. In this demo, markers are based on a basic rule: when
                price crosses <strong>above</strong> the MA20 line we mark a{" "}
                <strong>BUY</strong>, and when price crosses{" "}
                <strong>below</strong> MA20 we mark a <strong>SELL</strong>.
              </p>
              <p>
                <strong>Why traders use this:</strong>
              </p>
              <ul>
                <li>
                  To visually see where a strategy would have traded on the
                  chart.
                </li>
                <li>To spot clusters of good and bad entries at a glance.</li>
                <li>
                  To debug or improve a strategy by eye before doing full
                  backtesting.
                </li>
                <li>
                  To communicate trade ideas and examples clearly to other
                  traders or in documentation.
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Backtests &amp; Equity Curve
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Backtests &amp; Equity Curve</h4>
              <p>
                A <strong>backtest</strong> takes a trading strategy, applies it
                to historical data, and simulates the trades it would have
                taken. From those trades we build an{" "}
                <strong>equity curve</strong> – a line showing how a starting
                account balance would have grown or shrunk over time if you had
                followed that strategy.
              </p>
              <p>
                In this app, the backtest engine takes the completed trades
                generated by the strategy (based on the markers on the chart)
                and walks forward through them, updating a hypothetical account
                balance with each trade result. That running balance is what
                powers metrics like total return and max drawdown.
              </p>
              <p>
                <strong>Why traders use this:</strong>
              </p>
              <ul>
                <li>
                  To see if a strategy would have made or lost money in the
                  past.
                </li>
                <li>
                  To understand how “bumpy” the ride is – smooth equity curve vs
                  wild swings.
                </li>
                <li>
                  To compare strategies on more than just P&amp;L (risk,
                  consistency, drawdowns).
                </li>
                <li>
                  To stress test ideas before risking real capital in live
                  markets.
                </li>
              </ul>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Performance Stats Panel
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Performance Stats Panel</h4>
              <p>
                The performance panel summarises the backtest in a few key
                numbers:
              </p>
              <ul>
                <li>
                  <strong>Trades, Wins, Losses</strong> – how many trades were
                  taken, and how many were profitable or losing.
                </li>
                <li>
                  <strong>Win rate</strong> – the percentage of trades that made
                  money (e.g. 40%).
                </li>
                <li>
                  <strong>Total P/L (per 1 unit)</strong> – how much profit or
                  loss the strategy made in absolute terms using the unit size
                  in the test.
                </li>
                <li>
                  <strong>Avg P/L</strong> – the average profit or loss per
                  trade across the whole backtest.
                </li>
                <li>
                  <strong>Max win / Max loss</strong> – the best and worst
                  individual trades, useful for seeing how “lumpy” the outcome
                  is.
                </li>
                <li>
                  <strong>Total return</strong> – the percentage change between
                  the starting balance and the final balance.
                </li>
                <li>
                  <strong>Max drawdown</strong> – the worst peak-to-trough drop
                  in equity. This shows how much pain you would have sat through
                  while running the strategy.
                </li>
                <li>
                  <strong>Sharpe ratio</strong> – a risk-adjusted return
                  measure. It compares the average return per period to the
                  volatility of those returns. Higher Sharpe generally means
                  more return per unit of risk.
                </li>
                <li>
                  <strong>Sortino ratio</strong> – similar to Sharpe, but only
                  penalises <em>downside</em> volatility (bad moves). It focuses
                  on risk from losses, not just any movement.
                </li>
                <li>
                  <strong>Expectancy per trade</strong> – the average percentage
                  gain or loss you can expect per trade over the long run,
                  combining win rate and win/loss size.
                </li>
              </ul>
              <p>
                Together, these stats help you judge not just{" "}
                <em>“does this make money?”</em> but{" "}
                <em>“how does it make money?”</em> – slow and steady, sharp
                boom-and-bust, or something in between.
              </p>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Execution Costs: Fees, Spread &amp; Slippage
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Execution Costs: Fees, Spread &amp; Slippage</h4>

              <p>
                Your raw strategy might look great on paper, but{" "}
                <strong>execution costs</strong> can quietly eat most of the
                profit. This app breaks execution costs into three main parts:
              </p>

              <ul>
                <li>
                  <strong>Fees</strong> – what the exchange charges you per
                  trade (e.g. 0.1% of trade value).
                </li>
                <li>
                  <strong>Spread cost</strong> – the hidden cost of buying at
                  the <em>ask</em> and selling at the <em>bid</em> instead of
                  some mid-price in the middle.
                </li>
                <li>
                  <strong>Slippage</strong> – the extra “drag” when your order
                  fills at a worse price than you expected because the market
                  moved or the order book was thin.
                </li>
              </ul>

              <h5>How this project models it</h5>
              <p>
                For each trade, the backtest keeps track of two key numbers:
              </p>
              <ul>
                <li>
                  <strong>profitBeforeCosts</strong> – P&amp;L as if trading was
                  free and frictionless (no fees, no spread, no slippage).
                </li>
                <li>
                  <strong>profitAfterCosts</strong> – P&amp;L after subtracting{" "}
                  fees, spread cost and slippage.
                </li>
              </ul>
              <p>
                Aggregating over all trades, you can see how much of your “edge”
                survives once realistic trading costs are applied.
              </p>

              <h5>Why fees matter</h5>
              <ul>
                <li>
                  Small percentage fees add up fast when you trade frequently.
                </li>
                <li>
                  High turnover strategies can be profitable before fees, and
                  unprofitable after.
                </li>
                <li>
                  Fee discounts (maker/taker, volume tiers) can completely
                  change whether a strategy is viable.
                </li>
              </ul>

              <h5>Why spread matters</h5>
              <ul>
                <li>
                  The <strong>spread</strong> is the gap between best bid and
                  best ask.
                </li>
                <li>
                  Market orders effectively “pay” the spread each round-trip
                  (enter + exit).
                </li>
                <li>
                  In tight markets (e.g. BTC/USDT) the spread is small; in
                  illiquid altcoins it can dominate your P&amp;L.
                </li>
              </ul>

              <h5>Why slippage matters</h5>
              <ul>
                <li>
                  Slippage gets worse with <strong>larger size</strong> and{" "}
                  <strong>thinner books</strong>.
                </li>
                <li>
                  Fast markets (news, liquidations) can cause large slippage
                  even on “liquid” pairs.
                </li>
                <li>
                  Aggressive strategies that hit the market with big orders are
                  especially vulnerable.
                </li>
              </ul>

              <p>
                By comparing <strong>Gross P/L</strong> vs{" "}
                <strong>Net P/L</strong> in the performance panel, you can see
                how much your strategy pays in “friction” just to get into and
                out of trades.
              </p>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Exposure, Position Size &amp; Leverage
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Exposure, Position Size &amp; Leverage</h4>

              <p>
                In the performance panel you’ll see references to{" "}
                <strong>trade size</strong>, <strong>exposure</strong> and{" "}
                <strong>leverage</strong>. These are all ways of answering:
              </p>

              <p style={{ fontStyle: "italic" }}>
                “How big is this trade compared to my account?”
              </p>

              <h5>Position size &amp; notional value</h5>
              <p>
                Your <strong>position size</strong> is how many units you trade
                (e.g. 0.01 BTC). The <strong>notional value</strong> is:
              </p>
              <p style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                Notional = price × quantity
              </p>
              <p>
                If BTC is 50,000 and you buy 0.01 BTC, your notional exposure is
                500.
              </p>

              <h5>Exposure vs account size</h5>
              <p>
                If your account size is 1,000 and you take a 500 notional trade,
                then your trade size is:
              </p>
              <p style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                500 / 1,000 = 0.5× account size
              </p>
              <p>
                In the app, this is reported as something like{" "}
                <strong>0.50× of account size</strong>.
              </p>

              <h5>Leverage &amp; “borrowing”</h5>
              <p>
                When your position is <strong>bigger</strong> than your account,
                you’re effectively using <strong>leverage</strong> (borrowing
                extra exposure from the exchange):
              </p>
              <ul>
                <li>
                  1× = trade size is roughly equal to account size (no
                  leverage).
                </li>
                <li>
                  2× = trade size is twice account size (roughly half your
                  exposure is “borrowed”).
                </li>
                <li>
                  5× = trade size is five times account size (very sensitive to
                  small moves).
                </li>
              </ul>
              <p>
                The panel also shows an estimate of{" "}
                <strong>“extra exposure beyond account”</strong>: the part of
                each trade that goes over your account size and is effectively
                borrowed.
              </p>

              <h5>Why this matters</h5>
              <ul>
                <li>
                  Bigger exposure makes profits larger, but also makes losses
                  and slippage larger.
                </li>
                <li>
                  High leverage strategies are much more likely to hit margin
                  calls or liquidation levels.
                </li>
                <li>
                  Fees, spread and slippage scale with notional size, not with
                  your account size.
                </li>
              </ul>

              <p>
                The goal of this panel is to build intuition for{" "}
                <strong>“how much am I really betting here?”</strong> – not just
                in pounds or dollars, but as a multiple of your account.
              </p>
            </div>
          </details>
          <details>
            <summary
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                marginTop: "0.5rem"
              }}
            >
              Risk of Ruin (Toy Model)
            </summary>
            <div style={{ paddingTop: "0.5rem" }}>
              <h4>Risk of Ruin (Toy Model)</h4>

              <p>
                <strong>Risk of Ruin</strong> estimates the probability that a
                trading strategy will hit a critical loss threshold — for
                example, losing <strong>50% of starting equity</strong> — based
                on its historical win rate and average loss size. It answers the
                question:
              </p>

              <p style={{ fontStyle: "italic" }}>
                “If I keep trading this way, how likely am I to blow up?”
              </p>

              <p>
                In this project, risk of ruin is shown as a{" "}
                <strong>simplified educational metric</strong>, intended to
                build intuition rather than provide professional-grade risk
                modelling.
              </p>

              <h5>How it’s calculated here</h5>

              <p>We use a conservative approximation:</p>

              <ul>
                <li>
                  Measure the strategy’s{" "}
                  <strong>average loss percentage</strong>.
                </li>
                <li>
                  Define a “ruin threshold” (here: <strong>−50% equity</strong>
                  ).
                </li>
                <li>
                  Estimate how many average losses in a row would reach that
                  threshold.
                </li>
                <li>
                  Compute the probability of such a streak using{" "}
                  <strong>loss probability</strong> (1 − win rate).
                </li>
              </ul>

              <p>
                Example: if the average loss is <strong>1%</strong>, then about{" "}
                <strong>50 consecutive losses</strong> would halve the account.
                If the loss probability is <strong>60%</strong>, then:
              </p>

              <p style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                Risk of ruin ≈ (0.6)<sup>50</sup>
              </p>

              <p>
                This number is usually extremely small, but the model is
                intentionally conservative.
              </p>

              <h5>Why traders use this</h5>

              <ul>
                <li>To check whether a strategy is structurally fragile.</li>
                <li>
                  To see how sensitive a system is to changes in win rate, loss
                  size, or volatility.
                </li>
                <li>
                  To understand how leverage or oversized positions amplify
                  risk.
                </li>
                <li>
                  To compare strategies based on survivability, not just
                  returns.
                </li>
              </ul>

              <h5>Limitations (important!)</h5>

              <p>
                This is a <strong>toy model</strong>. Real risk of ruin depends
                on:
              </p>

              <ul>
                <li>fat-tailed distributions</li>
                <li>loss clustering and volatility regimes</li>
                <li>changing position sizes</li>
                <li>liquidation levels and margin rules</li>
                <li>black-swan events</li>
              </ul>

              <p>
                Professional risk systems use{" "}
                <strong>Monte Carlo simulation</strong>,{" "}
                <strong>bootstrap sampling</strong>, and{" "}
                <strong>stochastic modelling</strong> to estimate ruin more
                accurately.
              </p>

              <p>
                Even so, this simple model gives a valuable intuition for
                whether a strategy is <strong>robust</strong> or{" "}
                <strong>dangerously unstable</strong>.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>
    </AppShell>
  );
}
