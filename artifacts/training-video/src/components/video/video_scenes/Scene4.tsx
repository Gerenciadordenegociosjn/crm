import { motion } from 'framer-motion';

export function Scene4() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex flex-row-reverse items-center justify-between px-[8vw] z-10"
    >
      {/* Background layer specific to scene */}
      <motion.div 
        className="absolute left-0 top-0 w-[50vw] h-screen bg-gradient-to-r from-primary/10 to-transparent pointer-events-none"
        initial={{ opacity: 0, x: '-10vw' }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      />

      <div className="flex w-full items-center justify-between gap-12 flex-row-reverse">
        <div className="w-[45%] relative h-[60vh] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 50, rotateX: 20 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="relative z-10"
          >
            <motion.div
              animate={{ y: [0, -15, 0], rotateY: [0, -5, 0], rotateX: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <img 
                src={`${import.meta.env.BASE_URL}images/glass-card.png`}
                className="w-[30vw] object-contain filter drop-shadow-[0_30px_60px_rgba(37,99,235,0.4)]"
                alt="Glass Card"
              />
            </motion.div>
          </motion.div>
          
          <motion.div
             className="absolute w-[35vw] h-[10vw] bg-primary/20 rounded-full blur-[80px]"
             animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
             transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="w-[50%] flex flex-col">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-6"
          >
            <span className="inline-block py-2 px-4 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium text-[1vw] tracking-wider uppercase">
              Perfil: Vendedor
            </span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="font-display text-[4.5vw] font-bold leading-none mb-8"
          >
            Foco no que <span className="text-primary">Importa.</span>
          </motion.h2>

          <div className="space-y-6">
            {[
              { label: 'Visão Exclusiva', desc: 'Veja apenas seus próprios clientes e negócios' },
              { label: 'Seus Resultados', desc: 'Acesso ao Pipeline e Relatórios com seus dados' },
              { label: 'Gestão de Contas', desc: 'Ficha do cliente para incluir e alterar contas de anúncio' }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.5 + (i * 0.15), ease: [0.16, 1, 0.3, 1] }}
                className="pl-6 border-l-2 border-primary/40"
              >
                <h3 className="text-[1.8vw] font-bold text-white mb-1">{item.label}</h3>
                <p className="text-[1.2vw] text-text-secondary">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
