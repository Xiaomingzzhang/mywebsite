
<!-- January一月、February二月、March三月、April四月、May五月、June六月、July七月 August八月、September九月、October十月、November十一月、December十二月 -->
+++
mintoclevel = 2
maxtoclevel = 3
title = "Euler Disk 与刚体的纯滚动"
published = "31 December 2023"
+++
@def tags = ["刚体动力学", "可视化", "Mathematica"]
# Euler Disk 与刚体的纯滚动

\toc
\setlevel{section} \resetcount{}

Euler 盘是一个很有意思的教学玩具, 它大概在上世纪九十年代被发明 (命名为 Euler 盘是为了纪念 Euler, 有条件的读者可以查看维基百科), 随后变成了一个较为流行的教学工具. Euler 盘是一个较重的, 扁的圆柱形的铁盘, 另外还有一个光滑的镜面, 使 Euler 盘可以在镜面上旋转. 不同于一个硬币只能在桌子上旋转几秒钟, 一个精心制作的 Euler 盘甚至能旋转 8 分钟, 可参看这个[视频](https://www.bilibili.com/video/BV14P4y177xW/?spm_id_from=333.337.search-card.all.click). 

下面我们将用理论力学的知识对 Euler 盘进行动力学建模, 并使用 Mathematica 求解微分方程, 可视化其运动.

由于 Euler 盘与镜面都是比较光滑的, 在建模时很自然地假设接触点的速度是水平的, 即接触点可以滑动. 然而在文献 \cite{petrie2002} 中的实验发现, 接触点至少在前期重心位置较高的时候没有滑动, 而是作纯滚动. 因此我们也将采用纯滚动这个假设. 如果读者想参考纯滑动的模型, 可参见我的手写稿 [Euler Disk](/files/Euler%20Disk.pdf). 考虑这样一个纯滚动的特例的难度, 与考虑任意刚体在水平面的纯滚动问题的难度没有太大区别, 因此我们将先考虑后者, 而后再特例化, 回到我们的模型.

\section{运动微分方程}
我们假设读者已经熟悉了刚体动力学的知识, 包括惯性张量, 角速度, 角动量, Euler 角等概念以及它们之间的联系. 这些知识可以在国内的任一本高等动力学教材中找到, 如果读者想看较为数学化的阐述, 可参考 Arnold 的经典教材: 经典力学的数学方法, 也可参看我的读书笔记: [刚体动力学](/files/rigid-body-dynamics1.pdf).

一般地, 刚体的运动微分方程在可建立在动系中, 也可建立在绝对坐标系中. 动系中的方程阶次更低, 对于动力学的定性分析更为方便; 虽然绝对坐标系的方程的阶次高, 但其坐标表述较为直观, 也可以直接使用这些坐标得到刚体运动的全部信息. 我们将对这两种建模方式都作介绍.

首先我们引入坐标系并介绍记号. 令 $oxyz$ 为绝对直角坐标系, $\hat{o}\hat{x}\hat{y}\hat{z}$ 为从 $oxyz$ 平移到刚体质心的坐标系, $OXYZ$ 与刚体固连, 由 $\hat{o}\hat{x}\hat{y}\hat{z}$ 旋转得到. 见下面的图:

~~~
<div style="width: 100%; height: 100%;">
    <img src="/files/axes.png">
</div>
~~~

记号:
- $O$ 所在的质心矢径为 $r$;
- 大写字母 $Q$ 表示一个起点为 $r$ 的矢量在 $OXYZ$ 中的三个分量;
- 相应小写字母 $\hat{q}$ 表示该矢量在 $\hat{o}\hat{x}\hat{y}\hat{z}$ 中的三个分量;
- 从 $\hat{o}\hat{x}\hat{y}\hat{z}$ 到 $OXYZ$ 的旋转矩阵为 $A_t$, 即有 $\hat{q}=A_t Q$;
- 不加 hat 的小写字母表示在 $oxyz$ 中的矢量;
- 接触点矢径为 $\hat{\gamma}$;
- 水平面在接触点对刚体的约束反力为 $f$ (包含支撑力与静摩擦力);
- 刚体质量为 $m$, 重力加速度为 $g$;
- 刚体在 $OXYZ$ 下的惯性张量为 $I$, $I$ 为对角矩阵, 三个对角元素分别为 $I_1,I_2,I_3$;
- 欧拉角采用 $z-x-z$ 方式旋转, 三个角度分别为 $\phi,\theta,\psi$.
- 水平面的单位法向量记为 $n=(0,0,1)^T$;
- 当 $oxyz$ 中的矢量进行平移时无关紧要, 那么我们就不区分 $\hat{o}\hat{x}\hat{y}\hat{z}$ 与 $oxyz$; 例如, 根据上面的约定, 对于 约束反力 $f$ 在 $OXYZ$ 中的投影 $F$, 我们有 $F=A_t^{-1}f$. 

\subsection{动坐标系中的运动微分方程}


\subsection{绝对坐标系中的运动微分方程}


\section{接触点的几何关系}


\section{数值求解及可视化}









## 参考文献

* \biblabel{petrie2002}{Petrie etc.(2002)}D. Petrie, J. L. Hunt, and C. G. Gray. Does the Euler Disk slip during its motion?. American Journal of Physics, 70:1025–1028, 2002.