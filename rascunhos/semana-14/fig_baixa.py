import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt, numpy as np, sys
out=sys.argv[1]
fig,ax=plt.subplots(figsize=(9.5,5),dpi=150)
x=np.linspace(2,18,200)
for z,ls in [(2,":"),(0,"-"),(-2,":")]:
    ax.plot(x,np.full_like(x,z),color="#888",lw=1,ls=ls)
    ax.text(18.1,z,f"z {z:+d}" if z else "z 0 (P50)",va="center",fontsize=8,color="#666")
# BEF
ax.plot(x,np.full_like(x,-2.3),color="#1d6fa3",lw=2.8,label="Baixa estatura familiar: canal paralelo baixo, VC normal, IO = IC, puberdade na idade certa, alvo genético baixo")
# ACCP
y=np.where(x<11,-2.2,np.where(x<14,-2.2-0.5*(x-11)/3,-2.7+2.4*(x-14)/4))
y=np.minimum(y,-0.3)
ax.plot(x,y,color="#4c9f70",lw=2.8,label="Atraso constitucional: canal baixo, “queda” na idade da puberdade dos colegas, estirão tardio, IO atrasada, alvo normal")
# patológica
yp=np.where(x<6,-0.3,-0.3-0.55*(x-6))
ax.plot(x[x<12],yp[x<12],color="#9b2226",lw=2.8,label="Patológica (GH, hipotireoidismo, Cushing, doença crônica): cruza canais, VC baixa")
ax.axvspan(11,14,color="#f3a712",alpha=0.12);ax.text(12.5,1.4,"puberdade\nhabitual",ha="center",fontsize=8,color="#a86a00")
ax.set_xlim(2,19.5);ax.set_ylim(-4.2,2.3)
ax.set_xlabel("idade (anos)",fontsize=9);ax.set_ylabel("estatura (escore z)",fontsize=9)
for s in ["top","right"]: ax.spines[s].set_visible(False)
ax.legend(fontsize=7.6,loc="lower center",bbox_to_anchor=(0.5,-0.42),frameon=False)
ax.set_title("Padrões de baixa estatura na curva de crescimento",fontsize=11,weight="bold",loc="left")
plt.tight_layout();plt.savefig(out,dpi=150)
