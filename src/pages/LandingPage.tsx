import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Shield, ArrowRight, Star, Check, Quote, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

// Logos de empresas como SVG inline para não depender de assets externos
const CompanyLogos = () => (
  <div className="flex items-center gap-6 mt-6 flex-wrap">
    {[
      { name: "TechBR", color: "#6366f1" },
      { name: "ClinicaVida", color: "#0ea5e9" },
      { name: "BarberPro", color: "#f59e0b" },
    ].map((co) => (
      <div key={co.name} className="flex items-center gap-1.5 opacity-40">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect width="18" height="18" rx="4" fill={co.color} />
          <path d="M5 9h8M9 5v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-bold text-zinc-500 tracking-wider uppercase">{co.name}</span>
      </div>
    ))}
  </div>
);

const testimonials = [
  {
    name: "Dra. Paula Menezes",
    role: "Dermatologista · Clínica Skin",
    company: "Clínica Skin",
    companyColor: "#0ea5e9",
    text: "O Agendai transformou a gestão da minha clínica. O link de agendamento automático no WhatsApp reduziu faltas e me deu mais tempo para focar nos pacientes. É uma ferramenta indispensável para profissionais liberais.",
    avatar: "PM",
  },
  {
    name: "Ricardo Oliveira",
    role: "Barbeiro Chefe · BarberPro",
    company: "BarberPro",
    companyColor: "#f59e0b",
    text: "Antes eu perdia metade do meu dia respondendo mensagens. Agora meus clientes agendam sozinhos e eu recebo tudo organizado. O faturamento aumentou porque não perco mais nenhum interessado por demora no atendimento.",
    avatar: "RO",
  },
  {
    name: "Fernanda Costa",
    role: "Personal Trainer · Studio Fit",
    company: "Studio Fit",
    companyColor: "#6366f1",
    text: "O design do Agendai passa uma imagem de muito profissionalismo. Meus clientes corporativos elogiam a facilidade. É simples, direto e resolve exatamente o que promete sem frescuras.",
    avatar: "FC",
  },
];

const proPlanFeatures = [
  'Agendamentos ilimitados',
  'Dashboard profissional com métricas',
  'Link personalizado exclusivo',
  'Remoção total da marca Agendai',
  'Suporte prioritário 24/7',
  'Gestão de Elite & Zero Conflitos',
  'Lembretes inteligentes',
];

const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

export default function LandingPage() {
  const [demoSlot, setDemoSlot] = useState('09:00');

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-zinc-100/60 px-6 py-4 flex justify-between items-center bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-zinc-800 to-black rounded-lg flex items-center justify-center shadow-xl group-hover:shadow-primary/20 transition-all duration-500 ring-1 ring-white/10">
            <Calendar className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-display font-bold tracking-tight text-zinc-900">Agendai</span>
            <span className="text-[8px] font-bold text-primary uppercase tracking-[0.2em]">Pro Edition</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm font-sans font-semibold">
          <Link to="/auth" className="text-zinc-500 hover:text-zinc-900 transition-colors">Acessar</Link>
          <Link to="/checkout" className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-zinc-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-zinc-800 transition-all shadow-xl ring-1 ring-zinc-900/5">
              Assinar Agora
            </div>
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-7xl lg:leading-[1.05] mb-6 lg:mb-8 font-display font-bold tracking-tight text-zinc-900">
              Sua agenda no <br className="hidden lg:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-primary to-zinc-500">piloto automático.</span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-500 mb-8 lg:mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed font-medium">
              O Agendai é a forma mais profissional de gerir seus horários. Crie seu link, compartilhe e deixe a tecnologia trabalhar por você.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 justify-center lg:justify-start">
              <Link to="/checkout" className="group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-zinc-900/0 rounded-xl blur-xl transition-all duration-1000 group-hover:blur-2xl"></div>
                <div className="relative bg-zinc-900 text-white px-8 lg:px-10 py-4 lg:py-5 rounded-xl text-base lg:text-lg font-sans font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-zinc-200 ring-1 ring-white/10">
                  Assinar Pro por R$ 39,90/mês
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-primary" />
                </div>
              </Link>
            </div>

            {/* Social Proof inside Hero */}
            <div className="flex items-center justify-center lg:justify-start gap-2 mt-10">
              <div className="flex -space-x-3 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5
                    }}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500 overflow-hidden"
                  >
                    <img
                      src={`https://i.pravatar.cc/100?u=${i + 10}`}
                      alt="User"
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                ))}
              </div>
              <p className="text-zinc-900 font-sans font-bold text-sm">
                +1.000 profissionais usando hoje
              </p>
            </div>

            <div className="flex justify-center lg:justify-start mt-6 opacity-60">
              <CompanyLogos />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -15, 0]
            }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              y: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            className="relative mt-8 lg:mt-0"
          >
            <div className="bg-white rounded-[40px] shadow-[0_45px_100px_-20px_rgba(0,0,0,0.12)] p-8 md:p-12 border border-zinc-100/60 relative z-10 w-full max-w-md mx-auto lg:max-w-none hover:shadow-[0_60px_120px_-25px_rgba(0,0,0,0.15)] transition-shadow duration-500">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className="text-2xl font-sans font-bold text-zinc-900 capitalize tracking-tight">
                    {format(new Date(), "EEEE, d MMM", { locale: ptBR })}
                  </h3>
                  <p className="text-zinc-400 text-[10px] font-sans font-bold uppercase tracking-[0.2em] mt-2">Horários para hoje</p>
                </div>
                <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100 shadow-inner">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setDemoSlot(time)}
                    className={cn(
                      "p-6 rounded-xl text-center font-sans font-bold transition-all duration-300 border",
                      demoSlot === time
                        ? "bg-zinc-900 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] border-zinc-900 scale-[1.05]"
                        : "bg-zinc-50 border-zinc-100 hover:border-zinc-300 hover:bg-white text-zinc-500"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="absolute -inset-10 bg-primary/5 rounded-full blur-[100px] -z-10 animate-pulse"></div>
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-zinc-900/5 rounded-full blur-[120px] -z-10"></div>
          </motion.div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-16 mt-40">
          <div className="space-y-6 group">
            <div className="w-14 h-14 bg-white rounded-lg shadow-md flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h4 className="text-xl font-sans font-semibold text-zinc-900">Segurança Total</h4>
            <p className="text-zinc-500 leading-relaxed font-medium">Seus dados e de seus clientes protegidos com criptografia de ponta a ponta.</p>
          </div>
          <div className="space-y-6 group">
            <div className="w-14 h-14 bg-white rounded-lg shadow-md flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <h4 className="text-xl font-sans font-semibold text-zinc-900">Link Personalizado</h4>
            <p className="text-zinc-500 leading-relaxed font-medium">Crie um link profissional e compartilhe em suas redes sociais com um clique.</p>
          </div>
          <div className="space-y-6 group">
            <div className="w-14 h-14 bg-white rounded-lg shadow-md flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <h4 className="text-xl font-sans font-semibold text-zinc-900">Automação Total</h4>
            <p className="text-zinc-500 leading-relaxed font-medium">Confirmações automáticas por e-mail. Seu cliente sempre informado, você sempre organizado.</p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-40">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Usado por profissionais de todo o Brasil</p>
            <h2 className="text-4xl font-display font-bold text-zinc-900 mb-4">Quem usa, recomenda</h2>
            <p className="text-zinc-500 font-medium">Resultados reais de quem já transformou sua agenda com o Agendai.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-xl border border-zinc-100 shadow-sm relative flex flex-col"
              >
                <Quote className="absolute top-6 right-6 w-8 h-8 text-zinc-100" />
                <div className="flex gap-1 mb-5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-zinc-600 italic mb-8 leading-relaxed flex-grow">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-zinc-50">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: t.companyColor }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-zinc-900 text-sm">{t.name}</h5>
                    <p className="text-zinc-400 text-xs font-medium">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pricing - Somente Plano Pro */}
        <div className="mt-40 mb-20" id="pricing">
          <div className="text-center mb-16">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Simples e transparente</p>
            <h2 className="text-4xl font-display font-bold text-zinc-900 mb-4">Um plano. Tudo incluso.</h2>
            <p className="text-zinc-500 font-medium">Sem surpresas. Sem taxas escondidas. Cancele quando quiser.</p>
          </div>
          <div className="max-w-md mx-auto">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 md:p-8 rounded-[32px] shadow-2xl shadow-primary/10 flex flex-col relative overflow-hidden border border-white/5 min-h-[420px]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/10 rounded-full blur-[80px]"></div>

              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-8">
                  <span className="text-primary font-sans font-bold uppercase tracking-widest text-[10px] bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    Plano Pro
                  </span>
                  <div className="flex items-baseline gap-2 mt-6 mb-2">
                    <h3 className="text-5xl font-display font-bold text-white">R$ 39,90</h3>
                    <span className="text-zinc-500 text-lg">/mês</span>
                  </div>
                  <p className="text-zinc-400 text-sm">O plano definitivo para profissionais que buscam excelência.</p>
                </div>

                <ul className="space-y-4 mb-8 flex-grow">
                  {proPlanFeatures.map(item => (
                    <li key={item} className="flex items-center gap-3 text-zinc-300 font-medium text-sm">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/checkout"
                  className="w-full py-4 rounded-lg bg-primary text-white font-sans font-bold text-lg hover:bg-white hover:text-zinc-900 transition-all text-center block shadow-lg shadow-primary/30"
                >
                  Assinar Agora →
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </main >

      <footer className="border-t border-zinc-100 py-16 px-6 text-center text-sm text-zinc-400 font-sans font-medium">
        <p>© 2026 Agendai. Todos os direitos reservados.</p>
      </footer>
    </div >
  );
}
