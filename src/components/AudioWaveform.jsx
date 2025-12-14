import React, { useRef, useEffect } from 'react';

/**
 * AudioWaveform Component
 * Displays animated waveform visualization for audio
 */
const AudioWaveform = ({ 
  analyser, 
  isRecording = false, 
  isPlaying = false,
  audioData = null,
  height = 60,
  color = '#10b981',
  backgroundColor = 'transparent',
  bars = 50
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    const clearCanvas = () => {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    };

    // Draw waveform from frequency data
    const drawWaveform = (dataArray) => {
      clearCanvas();

      const barWidth = width / bars;
      const barGap = 2;
      const actualBarWidth = barWidth - barGap;

      for (let i = 0; i < bars; i++) {
        const dataIndex = Math.floor((i / bars) * dataArray.length);
        const value = dataArray[dataIndex] / 255; // Normalize to 0-1
        const barHeight = value * height;

        const x = i * barWidth;
        const y = height - barHeight;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '80'); // Add transparency

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, actualBarWidth, barHeight);
      }
    };

    // Draw static waveform from audio buffer
    const drawStaticWaveform = () => {
      if (!audioData || audioData.length === 0) {
        clearCanvas();
        return;
      }

      clearCanvas();

      const barWidth = width / bars;
      const barGap = 2;
      const actualBarWidth = barWidth - barGap;

      for (let i = 0; i < bars; i++) {
        const dataIndex = Math.floor((i / bars) * audioData.length);
        const value = Math.abs(audioData[dataIndex] || 0);
        const barHeight = Math.min(value * height, height);

        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, actualBarWidth, barHeight);
      }
    };

    // Animation loop for live recording/playback
    const animate = () => {
      if (!analyser) {
        clearCanvas();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      drawWaveform(dataArray);
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start/stop animation based on state
    if ((isRecording || isPlaying) && analyser) {
      animate();
    } else if (audioData) {
      drawStaticWaveform();
    } else {
      clearCanvas();
    }

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isRecording, isPlaying, audioData, height, color, backgroundColor, bars]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
};

export default AudioWaveform;
