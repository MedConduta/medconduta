import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt, numpy as np, sys
out=sys.argv[1]
fig,(a1,a2)=plt.subplots(2,1,figsize=(10,6.2),dpi=150,sharex=True)
def vc(ax,pico,alt,cor):
    x=np.linspace(6,18,300)
    y=5.5+alt*np.exp(-((x-pico)/1.1)**2)-np.clip((x-pico-1.5)*1.8,0,5.5)
    y=np.clip(y,0.3,None)
    ax.fill_between(x,0,y,color=cor,alpha=0.12);ax.plot(x,y,color=cor,lw=2.2)
    ax.set_ylim(0,13);ax.set_ylabel("VC (cm/ano)",fontsize=8.5)
    for s in ["top","right"]: ax.spines[s].set_visible(False)
vc(a1,11.5,3.2,"#c0396b")
eventos_f=[(8,13,10.7,"Telarca (M2) — 1º sinal: 8 a 13 anos","#c0396b"),(9,14,9.3,"Pubarca (P2)","#e07a9f"),
           (10.5,12.5,7.9,"Estirão: começa em M2, pico em M3 (~8,5 cm/ano)","#7a1f45"),(11,15,6.5,"Menarca em M4, 2–3 anos após a telarca","#9b2226")]
for a,b,y,t,c in eventos_f:
    a1.plot([a,b],[y,y],color=c,lw=6,solid_capstyle="round",alpha=.85);a1.text(b+0.15,y,t,va="center",fontsize=8)
a1.set_title("Meninas",fontsize=10,weight="bold",loc="left")
vc(a2,13.7,4.3,"#1d6fa3")
eventos_m=[(9,14,11.2,"Volume testicular ≥ 4 mL (G2) — 1º sinal: 9 a 14 anos","#1d6fa3"),(10,15,9.8,"Pubarca (P2) e crescimento peniano (G3)","#5aa0d0"),
           (12.5,14.5,8.4,"Estirão: começa em G3, pico em G4 (~9,5 cm/ano)","#0b3d63"),(13,14.5,7.0,"Ginecomastia puberal (G3–G4) e espermarca","#6a4c93")]
for a,b,y,t,c in eventos_m:
    a2.plot([a,b],[y,y],color=c,lw=6,solid_capstyle="round",alpha=.85);a2.text(b+0.15,y,t,va="center",fontsize=8)
a2.set_title("Meninos",fontsize=10,weight="bold",loc="left");a2.set_xlabel("idade (anos)",fontsize=9)
a2.set_xlim(6,22.5);a2.set_xticks(range(6,19))
fig.suptitle("Sequência da puberdade e velocidade de crescimento (VC)",fontsize=11,weight="bold",x=0.02,ha="left")
plt.tight_layout();plt.savefig(out,dpi=150)
