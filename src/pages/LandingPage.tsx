import { Link } from 'react-router-dom';
import { Calendar, Clock, Shield, ArrowRight, Star, Check, Quote } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LandingPage() {
  const testimonials = [
    { name: "Dra. Ana Silva", role: "Psicóloga", text: "O Agendai reduziu meus faltosos em 40%. O link automático no WhatsApp é um divisor de águas." },
    { name: "Marco Aurélio", role: "Barbeiro", text: "Meus clientes amam a facilidade. Não preciso mais atender telefone enquanto corto cabelo." },
    { name: "Juliana Costa", role: "Personal Trainer", text: "Simples e elegante. Passa uma imagem muito mais profissional para os meus alunos." },
  ];

  const freePlanFeatures = ['Até 50 agendamentos/mês', 'Link personalizado', 'Página de reserva padrão', 'Suporte via e-mail'];
  const proPlanFeatures = ['Agendamentos ilimitados', 'Dashboard profissional', 'Remoção da marca Agendai', 'Suporte prioritário 24/7', 'Estatísticas avançadas'];
  const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

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
          <Link to="/auth" className="text-zinc-500 hover:text-zinc-900 transition-colors">Entrar</Link>
          <Link to="/auth" className="bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-primary/10">
            Começar Grátis
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl lg:text-7xl leading-[1.1] mb-8 font-display font-bold tracking-tight text-zinc-900">
              Sua agenda no <br />
              <span className="italic text-primary">piloto automático.</span>
            </h1>
            <p className="text-xl text-zinc-500 mb-10 max-w-md leading-relaxed font-medium">
              Crie seu link personalizado, compartilhe com seus clientes e deixe o Agendai cuidar do resto.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <Link to="/auth" className="bg-primary text-white px-10 py-5 rounded-xl text-lg font-sans font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 group shadow-xl shadow-primary/20">
                Criar minha conta
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-4 px-2">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <img key={i} src={`https://picsum.photos/seed/${i}/48/48`} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" alt="usuário" />
                  ))}
                </div>
                <span className="text-zinc-400 font-sans font-medium tracking-wide uppercase text-[10px]">+500 profissionais</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-10 border border-zinc-100 relative z-10">
              <div className="flex items-center justify-between mb-10">
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
            <p className="text-zinc-500 leading-relaxed font-medium">Crie um link profissional e compartilhe em suas redes sociais.</p>
          </div>
          <div className="space-y-6 group">
            <div className="w-14 h-14 bg-white rounded-xl shadow-md flex items-center justify-center border border-zinc-100 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-primary" />
            </div>
            <h4 className="text-xl font-sans font-semibold text-zinc-900">Gestão de Horários</h4>
            <p className="text-zinc-500 leading-relaxed font-medium">Configure seus horários de atendimento e bloqueie datas específicas com facilidade.</p>
          </div>
        </div>

        {/* Social Proof */}
        <div className="mt-40">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-zinc-900 mb-4">Amado por profissionais</h2>
            <p className="text-zinc-500 font-medium">Veja o que quem já usa o Agendai tem a dizer.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="bg-white p-8 rounded-2xl border border-zinc-100 shadow-sm relative"
              >
                <Quote className="absolute top-6 right-6 w-8 h-8 text-zinc-100" />
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-zinc-600 italic mb-6 leading-relaxed">"{t.text}"</p>
                <div>
                  <h5 className="font-sans font-bold text-zinc-900">{t.name}</h5>
                  <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-40 mb-20" id="pricing">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-zinc-900 mb-4">Planos que acompanham seu crescimento</h2>
            <p className="text-zinc-500 font-medium">Comece grátis e evolua para o Pro quando precisar de mais poder.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-10 rounded-3xl border border-zinc-100 shadow-sm flex flex-col">
              <div className="mb-8">
                <span className="text-zinc-400 font-sans font-bold uppercase tracking-widest text-[10px] bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">Básico</span>
                <h3 className="text-3xl font-display font-bold mt-4">Grátis</h3>
                <p className="text-zinc-400 mt-2 text-sm">Para quem está começando agora.</p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                {freePlanFeatures.map(item => (
                  <li key={item} className="flex items-center gap-3 text-zinc-600 font-medium text-sm">
                    <Check className="w-5 h-5 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="w-full py-4 rounded-xl border-2 border-zinc-100 text-zinc-900 font-sans font-bold hover:bg-zinc-50 transition-all text-center">
                Começar agora
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-zinc-900 p-10 rounded-3xl shadow-2xl shadow-primary/20 flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors"></div>
              <div className="mb-8 relative z-10">
                <span className="text-primary font-sans font-bold uppercase tracking-widest text-[10px] bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Mais Popular</span>
                <div className="flex items-baseline gap-2 mt-4">
                  <h3 className="text-3xl font-display font-bold text-white">R$ 1,99</h3>
                  <span className="text-zinc-500 text-sm">/mês</span>
                </div>
                <p className="text-zinc-400 mt-2 text-sm">Tudo o que você precisa para escalar.</p>
              </div>
              <ul className="space-y-4 mb-10 flex-grow relative z-10">
                {proPlanFeatures.map(item => (
                  <li key={item} className="flex items-center gap-3 text-zinc-300 font-medium text-sm">
                    <Check className="w-5 h-5 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="w-full py-4 rounded-xl bg-primary text-white font-sans font-bold hover:bg-white hover:text-zinc-900 transition-all text-center relative z-10 shadow-lg shadow-primary/20">
                Assinar Plano Pro
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-100 py-16 px-6 text-center text-sm text-zinc-400 font-sans font-medium uppercase tracking-widest text-[10px]">
        <p>© 2026 Agendai. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
