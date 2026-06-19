import Hero from './components/Hero'
import SystemSection from './components/SystemSection'
import Projects from './components/Projects'
import About from './components/About'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <Hero />
      <main>
        <SystemSection />
        <Projects />
        <About />
      </main>
      <Footer />
    </div>
  )
}

export default App
