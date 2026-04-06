// {/* Chat Window Component */ }
// {
//   activeChat.show && activeChat.chatId && activeChat.car && activeChat.driver && (
//     <ChatWindow
//       chatId={activeChat.chatId}
//       car={activeChat.car}
//       driver={activeChat.driver}
//       onClose={() => setActiveChat({ show: false })}
//     />
//   )
// }

// {/* Delete Confirmation Modal */ }
// {
//   showDeleteConfirm && (
//     <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scaleIn">
//         <div className="p-6 text-center">
//           <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
//             <Trash2 className="w-8 h-8 text-red-600" />
//           </div>
//           <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Request?</h3>
//           <p className="text-gray-600 mb-6 font-medium">
//             Are you sure you want to delete this trip request? This action cannot be undone.
//           </p>
//           <div className="flex gap-3">
//             <button
//               onClick={() => setShowDeleteConfirm(null)}
//               className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={() => handleDeleteRequest(showDeleteConfirm)}
//               className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-600/20"
//             >
//               Delete
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// {/* Tip for Drivers & passengers */ }
// {
//   isDriver && (
//     <div className="mx-2 mt-6 md:mt-8 md:mx-0 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5">
//       <div className="flex flex-col sm:flex-row items-start gap-3">
//         <div className="bg-blue-100 p-2 rounded-lg self-start">
//           <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
//         </div>
//         <div>
//           <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Tips for Drivers</h4>
//           <ul className="space-y-2 text-gray-700 text-xs sm:text-sm">
//             <li className="flex items-start gap-2">
//               <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
//               <span><strong>Nearby Filter:</strong> Shows requests matching your location: {driverCity ? `${driverCity}, ${driverState}` : driverState || "Set your location in profile"}</span>
//             </li>
//             <li className="flex items-start gap-2">
//               <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
//               <span>Views increase when you click "Make Offer" - even if you don't submit</span>
//             </li>
//             <li className="flex items-start gap-2">
//               <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mt-0.5 flex-shrink-0" />
//               <span>You can only make one offer per request. Delete your current offer to make a new one.</span>
//             </li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   )
// }

// {/* Vehicle Image Preview Modal */ }
// {
//   showVehiclePreview.show && showVehiclePreview.vehicle && (
//     <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
//       <div className="relative w-full max-w-2xl bg-gray-900 rounded-2xl overflow-hidden border border-gray-700">
//         <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 backdrop-blur-md">
//           <h3 className="font-bold text-white flex items-center gap-2">
//             <Car className="w-5 h-5 text-blue-400" />
//             {showVehiclePreview.vehicle.make} {showVehiclePreview.vehicle.model}
//           </h3>
//           <button onClick={() => setShowVehiclePreview({ show: false })} className="p-2 bg-gray-800 rounded-full text-white">
//             <X className="w-5 h-5" />
//           </button>
//         </div>
//         <div className="relative aspect-video bg-black flex items-center justify-center">
//           {showVehiclePreview.vehicle.images?.length > 0 ? (
//             <>
//               <img
//                 src={showVehiclePreview.vehicle.images[previewImageIndex]}
//                 alt="Vehicle"
//                 className="w-full h-full object-contain"
//               />
//               {showVehiclePreview.vehicle.images.length > 1 && (
//                 <>
//                   <button
//                     onClick={() => setPreviewImageIndex(prev => (prev === 0 ? showVehiclePreview.vehicle.images.length - 1 : prev - 1))}
//                     className="absolute left-2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
//                   >
//                     &lt;
//                   </button>
//                   <button
//                     onClick={() => setPreviewImageIndex(prev => (prev === showVehiclePreview.vehicle.images.length - 1 ? 0 : prev + 1))}
//                     className="absolute right-2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
//                   >
//                     &gt;
//                   </button>
//                 </>
//               )}
//             </>
//           ) : (
//             <div className="text-gray-500 flex flex-col items-center gap-2">
//               <Car className="w-12 h-12" />
//               No images available
//             </div>
//           )}
//         </div>
//         <div className="p-4 bg-gray-900">
//           <div className="flex gap-2 justify-center">
//             {showVehiclePreview.vehicle.images?.map((_: any, i: number) => (
//               <button
//                 key={i}
//                 onClick={() => setPreviewImageIndex(i)}
//                 className={`w-2 h-2 rounded-full ${i === previewImageIndex ? 'bg-blue-500 w-4' : 'bg-gray-700'} transition-all`}
//               />
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
//     </div >
//   );
// }
