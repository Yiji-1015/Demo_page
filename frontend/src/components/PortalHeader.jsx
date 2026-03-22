import React from 'react';
import { motion } from 'framer-motion';

export default function PortalHeader() {
  return (
    <div className="relative overflow-hidden bg-white border-b border-gray-100">
      <div className="relative px-8 py-14 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl"
        >
          {/* Logo & Title */}
          <div className="flex items-center gap-5 mb-6">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69425d25058a80a1c4b3e584/ba2042d8b_favicon.png"
              alt="LLOYDK Logo"
              className="w-14 h-14 object-contain"
            />
            <div>
              <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-0.5">LLOYDK</h1>
              <p className="text-[14px] font-medium text-gray-500 tracking-wide">DEMO PORTAL</p>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-[17px] text-gray-600 max-w-2xl leading-relaxed">
            혁신적인 솔루션을 직접 경험해 보세요. <br /> 각 데모를 통해 비즈니스 가치를 확인하실 수 있습니다.
          </p>

          {/* Stats */}
          <div className="flex items-center gap-8 mt-8 pt-7 border-t border-gray-100">
            <div>
              <div className="text-[22px] font-semibold text-gray-900 tracking-tight">Enterprise</div>
              <div className="text-[13px] text-gray-500 mt-0.5">솔루션 레벨</div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <div className="text-[22px] font-semibold text-gray-900 tracking-tight">Real-time</div>
              <div className="text-[13px] text-gray-500 mt-0.5">시연 환경</div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <div className="text-[22px] font-semibold text-gray-900 tracking-tight">Secure</div>
              <div className="text-[13px] text-gray-500 mt-0.5">통합 SSO</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}