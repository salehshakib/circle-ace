import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Score from '@/models/Score';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { username, score, time } = body;

    if (!username || typeof score !== 'number' || typeof time !== 'number') {
      return NextResponse.json(
        { error: 'Username, score, and time are required' },
        { status: 400 }
      );
    }

    const newScore = new Score({
      username: username.trim(),
      score,
      time
    });

    await newScore.save();

    return NextResponse.json(
      { message: 'Score saved successfully', data: newScore },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const topScores = await Score.find()
      .sort({ score: -1, time: 1 })
      .limit(5)
      .select('username score time createdAt')
      .lean();

    return NextResponse.json({ data: topScores }, { status: 200 });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}