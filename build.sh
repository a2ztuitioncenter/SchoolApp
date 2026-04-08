#!/bin/bash
# Render Build & Start Script for Tuition App

echo "🚀 Installing dependencies..."
npm install -g bun

echo "📦 Installing backend dependencies..."
cd backend
bun install
cd ..

echo "📦 Installing frontend dependencies..."  
cd frontend
bun install
cd ..

echo "✅ Build complete - ready to start"
