import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Download, Upload } from 'lucide-react';
import AudioWaveform from './AudioWaveform';

/**
 * AudioRecorder Component
 * Professional audio recording with waveform visualization, playback, and quota tracking
 */
const AudioRecorder = ({ 
  onRecordingComplete,
  remainingQuota = Infinity,
  maxDuration = 600, // 10 minutes default
  className = ''
}) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Audio processing
  const [analyser, setAnalyser] = useState(null);
  const [audioData, setAudioData] = useState(null);
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioElementRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const playbackTimerRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate file size
  const getFileSizeText = (blob) => {
    if (!blob) return '';
    const sizeInMB = blob.size / (1024 * 1024);
    return sizeInMB >= 1 
      ? `${sizeInMB.toFixed(2)} MB` 
      : `${(blob.size / 1024).toFixed(2)} KB`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Check quota
      if (remainingQuota <= 0) {
        alert('Recording quota exceeded. Please upgrade your plan.');
        return;
      }

      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;

      // Setup audio context for visualization
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        
        // Process audio for waveform
        processAudioForWaveform(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Close audio context
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        setAnalyser(null);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Check if max duration or quota exceeded
          if (newTime >= maxDuration || newTime >= remainingQuota) {
            stopRecording();
            return prev;
          }
          
          return newTime;
        });
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Process audio blob for waveform visualization
  const processAudioForWaveform = async (blob) => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      setDuration(audioBuffer.duration);
      
      // Extract channel data for waveform
      const rawData = audioBuffer.getChannelData(0);
      const samples = 200; // Number of samples for waveform
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
    } catch (err) {
      console.error('Error processing audio:', err);
    }
  };

  // Play recorded audio
  const playRecording = () => {
    if (!recordedBlob || !audioElementRef.current) return;
    
    const audio = audioElementRef.current;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    } else {
      audio.play();
      setIsPlaying(true);
      
      // Setup playback timer
      playbackTimerRef.current = setInterval(() => {
        setPlaybackTime(audio.currentTime);
      }, 100);
    }
  };

  // Delete recording
  const deleteRecording = () => {
    if (window.confirm('Delete this recording?')) {
      setRecordedBlob(null);
      setAudioData(null);
      setDuration(0);
      setPlaybackTime(0);
      setRecordingTime(0);
      setIsPlaying(false);
      
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
    }
  };

  // Download recording
  const downloadRecording = () => {
    if (!recordedBlob) return;
    
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Use recording for transcription
  const useRecording = () => {
    if (!recordedBlob) return;
    
    const file = new File([recordedBlob], 'recording.webm', { type: 'audio/webm' });
    onRecordingComplete?.(file);
  };

  // Update audio element when blob changes
  useEffect(() => {
    if (recordedBlob && audioElementRef.current) {
      const url = URL.createObjectURL(recordedBlob);
      audioElementRef.current.src = url;
      
      audioElementRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
        }
      };
      
      return () => URL.revokeObjectURL(url);
    }
  }, [recordedBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Recording Controls */}
      {!recordedBlob && (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Record Audio</h3>
              <p className="text-sm text-slate-500">
                {isRecording 
                  ? `Recording: ${formatTime(recordingTime)}` 
                  : 'Click to start recording'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Quota Remaining</p>
              <p className="font-semibold text-emerald-600">
                {formatTime(remainingQuota)}
              </p>
            </div>
          </div>

          {/* Waveform Visualization */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
            <AudioWaveform
              analyser={analyser}
              isRecording={isRecording}
              height={80}
              color="#10b981"
              bars={60}
            />
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={remainingQuota <= 0}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-all animate-pulse"
              >
                <Square className="w-5 h-5" />
                Stop Recording
              </button>
            )}
          </div>

          {/* Warning if quota low */}
          {remainingQuota < 60 && remainingQuota > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                ⚠️ Only {formatTime(remainingQuota)} remaining in your quota
              </p>
            </div>
          )}
        </div>
      )}

      {/* Playback Interface */}
      {recordedBlob && (
        <div className="bg-white rounded-xl border-2 border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900">Recorded Audio</h3>
              <p className="text-sm text-slate-500">
                Duration: {formatTime(duration)} • Size: {getFileSizeText(recordedBlob)}
              </p>
            </div>
          </div>

          {/* Waveform with playback indicator */}
          <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200 relative overflow-hidden">
            <AudioWaveform
              audioData={audioData}
              isPlaying={isPlaying}
              height={80}
              color="#10b981"
              bars={100}
            />
            
            {/* Playback progress overlay */}
            {duration > 0 && (
              <div 
                className="absolute top-0 left-0 h-full bg-emerald-500 opacity-20 transition-all"
                style={{ width: `${(playbackTime / duration) * 100}%` }}
              />
            )}
            
            {/* Time display */}
            <div className="absolute top-2 right-2 bg-slate-900 text-white text-xs px-2 py-1 rounded">
              {formatTime(playbackTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={playRecording}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Play
                </>
              )}
            </button>
            
            <button
              onClick={deleteRecording}
              className="px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
              title="Delete recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={downloadRecording}
              className="px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
              title="Download recording"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* Use for Transcription */}
          <button
            onClick={useRecording}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white py-3 rounded-lg font-semibold hover:from-slate-800 hover:to-slate-700 transition-all"
          >
            <Upload className="w-5 h-5" />
            Use for Transcription
          </button>
        </div>
      )}

      {/* Hidden audio element for playback */}
      <audio ref={audioElementRef} className="hidden" />
    </div>
  );
};

export default AudioRecorder;
