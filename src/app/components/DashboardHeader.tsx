'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import MarketCreationModal from './MarketCreationModal';
import MarketAssociationModal from './MarketAssociationModal';
import { supabase } from '../lib/supabase';

// Video Upload Modal Component
interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userWalletAddress?: string;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ isOpen, onClose, userWalletAddress }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [marketAddress, setMarketAddress] = useState<string>('');
  const [availableMarkets, setAvailableMarkets] = useState<any[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch available markets when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchAvailableMarkets();
    }
  }, [isOpen]);

  const fetchAvailableMarkets = async () => {
    setIsLoadingMarkets(true);
    setError(null);
    try {
      // Fetch markets directly from Supabase
      const { data, error: supabaseError } = await supabase
        .from('market_metadata')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      
      setAvailableMarkets(data || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
      setError('Unable to load available markets. Please try again.');
      setAvailableMarkets([]);
    } finally {
      setIsLoadingMarkets(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's a video file
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file (MP4, MOV, etc.)');
        setSelectedFile(null);
        return;
      }
      
      // Check file size (max 50MB for Supabase free tier)
      const MAX_SIZE_MB = 50;
      const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
      if (file.size > MAX_SIZE_BYTES) {
        setError(`Video too large! Max ${MAX_SIZE_MB}MB allowed. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !marketAddress || !userWalletAddress) {
      setError('Please select a video file and enter a market address');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `video_${userWalletAddress.slice(0, 8)}_${Date.now()}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const videoUrl = urlData.publicUrl;

      // Create livestream record in database
      const { data: livestreamData, error: dbError } = await supabase
        .from('livestreams')
        .insert({
          title: selectedFile.name.replace(/\.[^/.]+$/, ''),
          description: `Uploaded video for market ${marketAddress}`,
          creator_wallet_address: userWalletAddress,
          stream_url: videoUrl,
          status: 'ended',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          category: 'general',
          market_address: marketAddress,
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      setSuccess('Video uploaded successfully! 🎉');
      // Reset form
      setSelectedFile(null);
      setMarketAddress('');
      // Close modal after delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setMarketAddress('');
      setAvailableMarkets([]);
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-yellow-50 border-4 border-black rounded-none shadow-window-pixel w-full max-w-md">
        {/* Header */}
        <div className="border-b-4 border-black px-6 py-4 bg-blue-600">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-yellow-50">📹 Upload Video</h2>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="text-yellow-200 hover:text-yellow-50 transition-colors disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-yellow-200 mt-1">Upload your hackathon project video</p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 bg-yellow-50">
          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-2 border-red-500 rounded-none p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-blue-100 border-2 border-blue-500 rounded-none p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-blue-800 text-sm font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* File Selection */}
          <div>
            <label className="block text-sm font-bold text-black mb-2">
              Select Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-none"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-1 font-medium">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </p>
            )}
          </div>

          {/* Market Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-black">
                Select Market
              </label>
                <button
                onClick={fetchAvailableMarkets}
                disabled={isLoadingMarkets || isUploading}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-yellow-50 px-2 py-1 border border-black rounded-none font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
            {isLoadingMarkets ? (
              <div className="w-full px-3 py-2 border-2 border-black bg-white flex items-center">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-black font-medium">Loading markets...</span>
              </div>
            ) : availableMarkets.length > 0 ? (
              <select
                value={marketAddress}
                onChange={(e) => setMarketAddress(e.target.value)}
                disabled={isUploading}
                className="w-full px-3 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed rounded-none font-medium"
              >
                <option value="">Choose a market...</option>
                {availableMarkets.map((market) => (
                  <option key={market.contract_address} value={market.contract_address}>
                    {market.contract_address.slice(0, 8)}...{market.contract_address.slice(-6)} - {market.category || 'General'}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-3 py-2 border-2 border-black bg-white">
                <div className="text-black text-center mb-2 font-medium">No markets available</div>
                <button
                  onClick={() => {
                    handleClose();
                    // This would trigger the market creation modal
                    // You could add a callback prop to open market creation
                  }}
                  className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-yellow-50 py-1 px-2 border border-black rounded-none font-bold transition-colors"
                >
                  📊 Create New Market First
                </button>
              </div>
            )}
            
            {/* Show selected market details */}
            {marketAddress && availableMarkets.length > 0 && (
              <div className="mt-2 p-3 bg-blue-100 border-2 border-blue-500 rounded-none">
                {(() => {
                  const selectedMarket = availableMarkets.find(m => m.contract_address === marketAddress);
                  return selectedMarket ? (
                    <div className="text-sm">
                      <p className="font-bold text-blue-900">
                        {selectedMarket.category || 'General'} Market
                      </p>
                      <p className="text-blue-700 text-xs break-all font-medium">
                        Contract: {selectedMarket.contract_address}
                      </p>
                      {selectedMarket.description && (
                        <p className="text-blue-600 text-xs mt-1">
                          {selectedMarket.description}
                        </p>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            
            <p className="text-xs text-gray-600 mt-1 font-medium">
              Choose the market to associate this video with
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isUploading || !selectedFile || !marketAddress || !userWalletAddress}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-yellow-50 font-bold py-3 px-4 border-2 border-black rounded-none transition-all duration-200 flex items-center justify-center uppercase text-sm"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-yellow-50 border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading & Processing...
              </>
            ) : !userWalletAddress ? (
              <>
                <span className="mr-2">🔒</span>
                Connect Wallet to Upload
              </>
            ) : !selectedFile ? (
              <>
                <span className="mr-2">📹</span>
                Select Video File
              </>
            ) : !marketAddress ? (
              <>
                <span className="mr-2">📊</span>
                Choose Market
              </>
            ) : (
              <>
                <span className="mr-2">🚀</span>
                Upload & Process Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DashboardHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showStats?: boolean;
  totalStreams?: number;
  liveStreams?: number;
  onMarketCreated?: (marketAddress: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title = "HackPredict",
  showBackButton = false,
  showStats = true,
  totalStreams = 0,
  liveStreams = 0,
  onMarketCreated
}) => {
  const { isLoggedIn, walletAddress } = useAuth();
  const [showMarketCreation, setShowMarketCreation] = useState(false);
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  const handleMarketCreated = (marketAddress: string) => {
    console.log('Market created:', marketAddress);
    // Call parent callback if provided
    if (onMarketCreated) {
      onMarketCreated(marketAddress);
    }
    // TODO: Add notification system or refresh data
  };

  return (
    <>
      <div className="bg-blue-500/90 border-4 border-black rounded-none shadow-window-pixel mb-4 sm:mb-6">
        <div className="flex items-center justify-between px-2 sm:px-3 py-1 bg-blue-600 text-yellow-50">
          <div className="flex items-center gap-2 sm:gap-4">
            {showBackButton && (
              <Link href="/" className="text-yellow-50 hover:text-yellow-200 transition-colors">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <span className="text-base sm:text-lg font-bold">{title}</span>
          </div>
          
          {showStats && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-center">
                <div className="text-xs sm:text-sm font-bold text-yellow-50">{totalStreams}</div>
                <div className="text-xs text-yellow-200">Streams</div>
              </div>
              <div className="text-center">
                <div className="text-xs sm:text-sm font-bold text-blue-400">{liveStreams}</div>
                <div className="text-xs text-yellow-200">Live</div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-pulse border border-black"></div>
                <span className="text-blue-400 text-xs font-bold">LIVE</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="bg-yellow-50 p-2 sm:p-4 text-black text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setShowMarketCreation(true)}
              className="bg-blue-600 hover:bg-blue-700 text-yellow-50 px-2 sm:px-3 py-1 border border-black rounded-none uppercase text-xs transition-colors"
            >
              <span className="hidden sm:inline">Create Market</span>
              <span className="sm:hidden">Market</span>
            </button>
            <button 
              onClick={() => setShowVideoUpload(true)}
              disabled={!isLoggedIn}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-yellow-50 px-2 sm:px-3 py-1 border border-black rounded-none uppercase text-xs transition-colors"
            >
              <span className="hidden sm:inline">📹 Upload Video</span>
              <span className="sm:hidden">📹 Upload</span>
            </button>
            <button className="bg-yellow-400 hover:bg-yellow-300 text-black px-2 sm:px-3 py-1 border border-black rounded-none uppercase text-xs transition-colors">
              <span className="hidden sm:inline">Browse Categories</span>
              <span className="sm:hidden">Browse</span>
            </button>
            <button className="bg-yellow-400 hover:bg-yellow-300 text-black px-2 sm:px-3 py-1 border border-black rounded-none uppercase text-xs transition-colors">
              <span className="hidden sm:inline">View History</span>
              <span className="sm:hidden">History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Market Creation Modal */}
      <MarketCreationModal
        isOpen={showMarketCreation}
        onClose={() => setShowMarketCreation(false)}
        onMarketCreated={handleMarketCreated}
      />

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showVideoUpload}
        onClose={() => setShowVideoUpload(false)}
        userWalletAddress={walletAddress || undefined}
      />
    </>
  );
};

export default DashboardHeader; 