# 🚛 FuelRoute-Pro

**FuelRoute-Pro** is a smart fuel transportation cost estimator that calculates route-based costs across truck and rail modes. It intelligently evaluates distances, commodity weights, and transit times to give users actionable insights into fuel logistics.

---

## 🔍 What It Does

- 🚚 Calculate transport cost per tonne–mile
- 🌐 Support global routes using geo-coordinates
- 📊 Estimate transit duration based on real-world constraints
- 🤖 Integrate with AI models via Ollama for deeper insights
- ⚙️ Compare routes and optimize decision-making
- 🎯 Choose lowest cost or shortest distance preference

## Configuration

Set `OPENAI_PRICE_CACHE_MS` to control how long fuel price estimates are cached.
The default is 900000 (15 minutes). Use `0` to disable caching entirely.

Fuel prices are fetched in real time from OpenAI using a prompt that requests the latest US market value. The response includes the price, date and source so you can verify the data.

### OpenAI Setup

If you see messages like `OpenAI service not available`, create a `.env` file with your API key. Run:

```
npm run setup
```

and follow the prompts to add `OPENAI_API_KEY` and other settings.
