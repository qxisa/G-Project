# AI-Generated Insights Setup Guide

The Interactive Data Analytics Dashboard now includes an AI-powered insights feature that provides intelligent analysis of your data using machine learning.

## Free AI API - Hugging Face

This feature uses the **Hugging Face Inference API**, which offers a free tier for personal use.

### Setup Instructions

1. **Create a Free Account**
   - Visit [Hugging Face](https://huggingface.co/join)
   - Sign up for a free account (no credit card required)

2. **Generate an API Token**
   - Go to your [Settings → Access Tokens](https://huggingface.co/settings/tokens)
   - Click "New token"
   - Give it a name (e.g., "Data Analytics Dashboard")
   - Select "read" permissions (this is sufficient)
   - Click "Generate token"
   - Copy the token (starts with `hf_`)

3. **Configure the Dashboard**
   - Open the dashboard in your browser
   - Upload a CSV file to analyze
   - Scroll to the "🤖 AI-Generated Insights" section
   - Paste your API token in the "Hugging Face API Key" field
   - Click "💾 Save Key"
   - Your key is stored securely in your browser's localStorage (never sent to any server except Hugging Face)

4. **Generate Insights**
   - Select one or more columns to analyze (hold Ctrl/Cmd for multiple)
   - Click "🔍 Generate AI Insights"
   - Wait 10-30 seconds for the first request (the model needs to load)
   - Subsequent requests will be faster

## How It Works

The dashboard:
1. Calculates statistical summaries of your selected columns
2. Creates an intelligent prompt for the AI model
3. Sends the prompt to Hugging Face's Mistral-7B-Instruct model
4. Receives and displays AI-generated insights about your data

## Features

- ✅ **Free to use** - No cost for normal usage
- ✅ **Privacy-focused** - Your API key is stored only in your browser
- ✅ **No data upload** - Only statistical summaries are sent to the API
- ✅ **Fallback mode** - If the API is unavailable, a statistical summary is shown instead
- ✅ **Intelligent analysis** - Identifies patterns, trends, and actionable insights

## Model Information

- **Model**: Mistral-7B-Instruct-v0.2
- **Provider**: Hugging Face
- **Type**: Large Language Model optimized for instruction following
- **Free Tier**: Available with rate limits

## Troubleshooting

### "The AI model is currently loading"
- This is normal for the first request
- Wait 20-30 seconds and try again
- The model stays loaded for a while after the first use

### "Invalid API key"
- Check that you copied the complete token (starts with `hf_`)
- Ensure the token has read permissions
- Try generating a new token

### API Limits
- Free tier has rate limits
- If you hit limits, wait a few minutes or upgrade to Hugging Face Pro

## Privacy & Security

- Your API key is stored in browser localStorage only
- The raw data never leaves your browser
- Only statistical summaries are sent to Hugging Face
- No data is stored on any external server
- You can clear your API key anytime using the "🗑️ Clear Key" button

## Alternative: Statistical Summary

If you prefer not to use AI or if the API is unavailable, the dashboard will automatically generate a statistical summary instead. This provides basic insights without requiring an API key.
