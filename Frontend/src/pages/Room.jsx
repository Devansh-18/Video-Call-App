import React from 'react'
import VideoCall from '../components/VideoCall/VideoCall'
import { useApp } from '../context/AppContext'

const Room = () => {
  const {handleCopyLink} = useApp();
  return (
    <div className='relative flex h-full w-full justify-start items-center'>
      <VideoCall/>
      <button className='buttonStyle text-gray-400 px-2 py-1 absolute top-2 left-2 z-30' onClick={handleCopyLink}>
        Share Link
      </button>
    </div>
  )
}

export default Room
