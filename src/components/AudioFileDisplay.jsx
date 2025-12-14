import React, { useState, useEffect, useRef } from 'react';
import { FileAudio, X, Play, Pause, Download } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

/**
 * AudioFileDisplay Component
 * Displays uploaded audio file with waveform visualization and playback
 */
const AudioFileDisplay = ({ 
  file, 
  onRemove,
  showPlayback = true,
  className = '' 
}) => {
  const [audioData, setAudioData] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  
  const audioRef = useRef(null);
  const playbackTimerRef = useRef(null);

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  // Process audio file for waveform
  useEffect(() => {
    if (!file) return;

    const processAudio = async () => {
      try {
        setIsProcessing(true);
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        setDuration(audioBuffer.duration);
        
        // Extract waveform data
        const rawData = audioBuffer.getChannelData(0);
        const samples = 150;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        
        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        setAudioData(filteredData);
        audioContext.close();
        setIsProcessing(false);
      } catch (err) {
        console.error('Error processing audio:', err);
        setIsProcessing(false);
      }
    };

    processAudio();
  }, [file]);

  // Setup audio element
  useEffect(() => {
    if (!file || !audioRef.current) return;
    
    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Toggle playback
  const togglePlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      
      playbackTimerRef.current = setInterval(() => {
        setPlaybackTime(audioRef.current.currentTime);
      }, 100);
    }
  };

  // Download file
  const downloadFile = () => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, []);

  if (!file) return null;

  return (
    <div className={`bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center">
          <FileAudio className="w-7 h-7 text-emerald-600" />
        </div>

        {/* File Info & Waveform */}
        <div className="flex-1 min-w-0">
          {/* File Details */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{file.name}</p>
              <p className="text-sm text-slate-600">
                {formatFileSize(file.size)}
                {duration > 0 && ` • ${formatTime(duration)}`}
              </p>
            </div>
            
            {onRemove && (
              <button
                onClick={onRemove}
                className="ml-2 p-1 hover:bg-red-100 rounded-full transition-colors"
                title="Remove file"
              >
                <X className="w-5 h-5 text-slate-500 hover:text-red-600" />
              </button>
            )}
          </div>

          {/* Waveform */}
          {isProcessing ? (
            <div className="bg-slate-100 rounded-lg h-16 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="text-sm ml-2">Processing audio...</span>
              </div>
            </div>
          ) : audioData ? (
            <div className="bg-white rounded-lg p-3 border border-slate-200 relative overflow-hidden">
              <AudioWaveform
                audioData={audioData}
                isPlaying={isPlaying}
                height={60}
                color="#10b981"
                bars={75}
              />
              
              {/* Playback progress */}
              {duration > 0 && (
                <div 
                  className="absolute top-0 left-0 h-full bg-emerald-500 opacity-20 transition-all pointer-events-none"
                  style={{ width: `${(playbackTime / duration) * 100}%` }}
                />
              )}
              
              {/* Time display */}
              {duration > 0 && (
                <div className="absolute bottom-1 right-1 bg-slate-900 text-white text-xs px-2 py-0.5 rounded">
                  {formatTime(playbackTime)} / {formatTime(duration)}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-100 rounded-lg h-16 flex items-center justify-center">
              <p className="text-sm text-slate-500">Unable to process audio</p>
            </div>
          )}

          {/* Playback Controls */}
          {showPlayback && audioData && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={togglePlayback}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2 px-4 rounded-lg hover:bg-emerald-600 transition-all text-sm font-medium"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Play Preview
                  </>
                )}
              </button>
              
              <button
                onClick={downloadFile}
                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default AudioFileDisplay;
