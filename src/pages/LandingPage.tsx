import { Link } from 'react-router-dom';
import { Calendar, Clock, Shield, ArrowRight, Star, Check, Quote, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    name: "Dra. Ana Silva",
    role: "Psicóloga · ClinicaVida",
    company: "ClinicaVida",
    companyColor: "#0ea5e9",
    text: "O Agendai reduziu meus faltosos em 40%. O link automático no WhatsApp é um divisor de águas. Não consigo imaginar trabalhar sem ele.",
    avatar: "AS",
  },
  {
    name: "Marco Aurélio",
    role: "Proprietário · BarberPro",
    company: "BarberPro",
    companyColor: "#f59e0b",
    text: "Meus clientes amam a facilidade. Não preciso mais atender telefone enquanto corto cabelo. O agendamento online aumentou meu faturamento.",
    avatar: "MA",
  },
  {
    name: "Juliana Costa",
    role: "CEO · TechBR Fitness",
    company: "TechBR",
    companyColor: "#6366f1",
    text: "Simples e elegante. Passa uma imagem profissional para os meus clientes corporativos e automatiza algo que antes tomava horas.",
    avatar: "JC",
  },
];

const proPlanFeatures = [
  'Agendamentos ilimitados',
  'Dashboard completo com métricas',
  'Link personalizado exclusivo',
  'Remoção da marca Agendai',
  'Suporte prioritário 24/7',
  'Integração com Google Calendar',
];

const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Navigation */}
      <nav className="border-b border-zinc-100 px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/10">
            <Calendar className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-zinc-900">Agendai</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-sans font-semibold">
          <a href="#pricing" className="text-zinc-500 hover:text-zinc-900 transition-colors">Preço</a>
          <Link to="/auth" className="text-zinc-500 hover:text-zinc-900 transition-colors">Entrar</Link>
          <Link to="/checkout" className="bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-primary/10">
            Assinar Agora
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
            <h1 className="text-4xl sm:text-5xl lg:text-7xl leading-[1.1] mb-6 lg:mb-8 font-display font-bold tracking-tight text-zinc-900">
              Sua agenda no <br className="hidden lg:block" />
              <span className="italic text-primary">piloto automático.</span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-500 mb-8 lg:mb-10 max-w-md mx-auto lg:mx-0 leading-relaxed font-medium">
              Crie seu link personalizado, compartilhe com seus clientes e deixe o Agendai cuidar do resto. Simples, elegante e eficiente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6 justify-center lg:justify-start">
              <Link to="/checkout" className="bg-primary text-white px-8 lg:px-10 py-4 lg:py-5 rounded-xl text-base lg:text-lg font-sans font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 group shadow-xl shadow-primary/20">
                Começar por R$1,99/mês
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="flex justify-center lg:justify-start mt-8 lg:mt-0">
              <CompanyLogos />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mt-8 lg:mt-0"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-10 border border-zinc-100 relative z-10 w-full max-w-md mx-auto lg:max-w-none">
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <div>
                  <h3 className="text-2xl font-sans font-semibold text-zinc-900 capitalize">
                    {format(new Date(), "EEEE, d MMM", { locale: ptBR })}
                  </h3>
                  <p className="text-zinc-400 text-[10px] font-sans font-medium uppercase tracking-widest mt-1">Selecione um horário</p>
                </div>
                <div className="w-14 h-14 bg-zinc-50 rounded-xl flex items-center justify-center border border-zinc-100">
                  <Clock className="w-7 h-7 text-primary" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {timeSlots.map((time, i) => (
                  <div key={time} className={i === 0 ? "bg-primary text-white p-5 rounded-xl text-center shadow-lg shadow-primary/20 font-sans font-semibold" : "bg-zinc-50 p-5 rounded-xl text-center hover:bg-zinc-100 transition-colors cursor-pointer text-zinc-600 font-sans font-semibold border border-zinc-100"}>
                    {time}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
          </motion.div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-16 mt-40">
          <div className="space-y-6 group">
            <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h4 className="text-xl font-sans font-semibold text-zinc-900">Segurança Total</h4>
            <p className="text-zinc-500 leading-relaxed font-medium">Seus dados e de seus clientes protegidos com criptografia de ponta a ponta.</p>
          </div>
          <div className="space-y-6 group">
            <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-primary" />
            </div>
            <h4 className="text-xl font-sans font-semibold text-zinc-900">Link Personalizado</h4>
            <p className="text-zinc-500 leading-relaxed font-medium">Crie um link profissional e compartilhe em suas redes sociais com um clique.</p>
          </div>
          <div className="space-y-6 group">
            <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
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
            <p className="text-zinc-500 font-medium">Resultados reais de quem já transformou sua agenda.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm relative flex flex-col"
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
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
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
              whileHover={{ scale: 1.02 }}
              className="bg-zinc-900 p-12 rounded-3xl shadow-2xl shadow-primary/20 flex flex-col relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl"></div>

              <div className="relative z-10">
                <span className="text-primary font-sans font-bold uppercase tracking-widest text-[10px] bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  Plano Pro
                </span>
                <div className="flex items-baseline gap-2 mt-6 mb-2">
                  <h3 className="text-5xl font-display font-bold text-white">R$ 1,99</h3>
                  <span className="text-zinc-500 text-lg">/mês</span>
                </div>
                <p className="text-zinc-400 text-sm mb-10">Tudo o que você precisa para escalar seu negócio.</p>

                <ul className="space-y-4 mb-10">
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
                  className="w-full py-5 rounded-2xl bg-primary text-white font-sans font-bold text-lg hover:bg-white hover:text-zinc-900 transition-all text-center block shadow-lg shadow-primary/30"
                >
                  Assinar Agora →
                </Link>
                <p className="text-center text-zinc-500 text-xs mt-4">✓ 7 dias grátis · Cancele a qualquer momento</p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-100 py-16 px-6 text-center text-sm text-zinc-400 font-sans font-medium">
        <p>© 2026 Agendai. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
