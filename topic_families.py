import re
RULES={
'Engineering Mathematics': [('Linear Algebra','linear algebra'),('Vector Analysis','vector'),('Complex Analysis','complex|residue'),('Differential Equations','differential'),('Probability and Statistics','probability|statistics|random'),('Calculus and Series','calculus|integral|series')],
'General Aptitude':[('Verbal Ability','verbal'),('Spatial Aptitude','spatial'),('Analytical Aptitude','analytical'),('Quantitative Aptitude','quantitative')],
'Networks':[('Two-Port Networks','two.port'),('Transient Circuits','transient|initial condition|switching'),('AC Circuits and Resonance','resonan|sinusoidal|phasor|ac circuit'),('Circuit Analysis and Network Theorems','.')],
'Signals and Systems':[('Sampling','sampling'),('Z-Transform','z.transform'),('Laplace Transform','laplace'),('Discrete Fourier Analysis','discrete.*fourier|dft|fft|fast fourier'),('Continuous Fourier Analysis','fourier'),('Convolution and LTI Response','convolution|lti frequency|lti system|digital filter'),('Signal and System Properties','.')],
'Electronic Devices':[('Optoelectronic Devices','optical|opto|photo|solar|led'),('MOS Devices','mos'),('Bipolar Junction Transistors','bjt|bipolar|fabrication'),('P-N Junctions','diode|p.n junction'),('Carrier Transport','transport|conductiv|generation|recombination'),('Semiconductor Physics','.')],
'Analog Circuits':[('Diode Circuits','diode|clipp|clamp'),('Oscillators','oscillat'),('Operational Amplifiers and Active Filters','op.amp|operational|active filter'),('Feedback Amplifiers','feedback'),('BJT Circuits','bjt'),('MOSFET Circuits','mosfet|mos '),('Differential Pairs and Current Sources','differential|current mirror|current source'),('Biasing and References','.')],
'Digital Circuits':[('Data Converters','converter|conversion|dac|adc|sample.and.hold'),('Sequential Circuits and Timing','sequential|flip.flop|latch|counter|state evolution'),('MOS Logic','cmos|mos logic|pass transistor'),('Number Systems and Arithmetic','number|arithmetic'),('Memory and Processor Architecture','computer|processor|memor|stack'),('Boolean and Combinational Logic','.')],
'Control Systems':[('State-Space Analysis','state.space|state variable'),('Time Response and Steady-State Error','time response|steady.state|second.order'),('Root Locus','root locus'),('Frequency Response and Nyquist','nyquist|frequency|bode|argument principle'),('Controllers and Compensators','controller|compensator'),('Stability','stability|characteristic'),('Block Diagrams and Transfer Functions','.')],
'Communications':[('Random Processes and Noise','random|noise|power spectral'),('Information Theory and Coding','information|entropy|coding|capacity|source coding'),('Quantization and PCM','quantiz|pcm|pulse code'),('Analog Modulation','amplitude|angle|analog|fm |spectral separation'),('Detection and Error Probability','detect|decision'),('Digital Transmission and Modulation','.')],
'Electromagnetics':[('Antennas','antenna'),('Waveguides and Optical Fibres','waveguide|fiber|fibre'),('Transmission Lines and S-Parameters','transmission|s.parameter|scattering'),('Plane Waves','plane.wave|plane wave|polarization'),('Static Fields and Maxwell Equations','.')]
}
def family(subject,topic):
 for label,pattern in RULES[subject]:
  if re.search(pattern,topic,re.I):return label
 return topic
