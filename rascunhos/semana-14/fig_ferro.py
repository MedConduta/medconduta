import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt, sys
out=sys.argv[1]
fig,(a1,a2)=plt.subplots(1,2,figsize=(11,4.4),dpi=150)
# estágios
est=["Normal","1. Depleção\ndos estoques","2. Eritropoese\nferropênica","3. Anemia\nferropriva"]
x=range(4)
fer=[100,25,10,5]; sat=[100,90,40,25]; hb=[100,100,95,70]; vcm=[100,100,97,80]
for y,c,l in [(fer,"#9b2226","Ferritina (1ª a cair)"),(sat,"#f3a712","Saturação de transferrina"),(vcm,"#6a4c93","VCM / HCM"),(hb,"#1d6fa3","Hemoglobina (última)")]:
    a1.plot(x,y,marker="o",lw=2.5,color=c,label=l)
a1.set_xticks(list(x));a1.set_xticklabels(est,fontsize=8.5)
a1.set_ylabel("% do valor normal",fontsize=9);a1.set_ylim(0,110)
a1.legend(fontsize=8,loc="lower left",frameon=False)
a1.set_title("Estágios da deficiência de ferro",fontsize=10.5,weight="bold",loc="left")
a1.text(3,-30,"CTLF (transferrina) sobe a partir do estágio 1–2; RDW sobe cedo",ha="right",fontsize=7.8,color="#444",style="italic")
for s in ["top","right"]: a1.spines[s].set_visible(False)
# resposta
d=[0,3,5,7,10,14,21,28,42,56,84]
ret=[1,2,5,8,10,7,4,3,2,1.5,1.2]
hbv=[8,8,8.1,8.3,8.7,9.3,10,10.6,11.6,12.4,13]
a2.plot(d,ret,color="#bc6c25",lw=2.5,marker="o",label="Reticulócitos (%) — pico em 5–10 dias")
b=a2.twinx();b.plot(d,hbv,color="#1d6fa3",lw=2.5,marker="s",label="Hb (g/dL)")
b.set_ylim(7,14);a2.set_ylim(0,12)
a2.set_xlabel("dias de ferro oral",fontsize=9);a2.set_ylabel("reticulócitos (%)",fontsize=9,color="#bc6c25");b.set_ylabel("Hb (g/dL)",fontsize=9,color="#1d6fa3")
a2.axvspan(21,28,color="#4c9f70",alpha=0.15);a2.text(24.5,11.2,"↑ Hb ≥ 1–2 g/dL\nem 3–4 semanas",ha="center",fontsize=7.8,color="#2d6a4f")
a2.text(84,0.6,"Hb normal em ~2 meses → manter para repor estoques",ha="right",fontsize=7.8,color="#444",style="italic")
h1,l1=a2.get_legend_handles_labels();h2,l2=b.get_legend_handles_labels();a2.legend(h1+h2,l1+l2,fontsize=8,loc="upper center",frameon=False,bbox_to_anchor=(0.5,-0.17),ncol=2)
a2.set_title("Resposta esperada ao tratamento",fontsize=10.5,weight="bold",loc="left")
for s in ["top"]: a2.spines[s].set_visible(False)
plt.tight_layout();plt.savefig(out,dpi=150)
