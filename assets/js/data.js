/*
 * Site content. Edit this file to add / update papers — no build step needed.
 *
 * Paper fields
 *   id        unique slug, also used as the anchor (#pub-<id>)
 *   title     full title; the part before the first ":" is shown in bold
 *   authors   one string; mark equal contribution with * and corresponding with †
 *   venue     shown in the badge, e.g. "CVPR 2026" or "arXiv 2026"
 *   year      used for grouping
 *   tags      any of: "embodied" | "recon" | "perception"
 *   selected  true → shown under the default "Selected" filter
 *   award     optional, e.g. "Highlight", "Oral"
 *   tldr      optional one-liner
 *   links     any of: project, arxiv, code, paper
 */
window.SITE = {
  me: "Tao Lu",

  topics: {
    embodied:   { label: "World models & robots" },
    recon:      { label: "Reconstruction & rendering" },
    perception: { label: "3D perception" },
  },

  pubs: [
    // ───────────── 2026 ─────────────
    {
      id: "real2gym",
      title: "Real2Gym: Building Gyms from Videos, Bringing Skills to Robots",
      authors: "Kerui Ren*, Yingxiang Xu*, Kaiwen Song, Linning Xu, Bo Dai, Mulin Yu†, Tao Lu†",
      venue: "arXiv 2026", year: 2026, tags: ["embodied"], selected: true,
      tldr: "Turns human and robot videos into interactive simulation gyms, where an agent learns reusable manipulation skills that transfer to real robots.",
      links: { project: "https://real2gym.github.io/", arxiv: "https://arxiv.org/abs/2609.37089", code: "https://github.com/real2gym/Real2Gym" },
    },
    {
      id: "hide-seek",
      title: "Benchmarking and Enhancing Skill-Level Memory for Partially Observable Robotic Manipulation",
      authors: "Yansong Shi, Jiange Yang, Xijie Yang, Shaowei Zhang, Yuhan Zhu, Tao Lu, Limin Wang",
      venue: "arXiv 2026", year: 2026, tags: ["embodied"],
      tldr: "HIDE, a benchmark for manipulation under partial observability, and SEEK, a memory framework that tracks hidden task state.",
      links: { project: "https://nanamma.github.io/HIDE-SEEK/", arxiv: "https://arxiv.org/abs/2609.38886" },
    },
    {
      id: "infinihand",
      title: "InfiniHand: Streaming World-Space Hand Motion Estimation from Egocentric Video",
      authors: "Kerui Ren, Kaiwen Song, Weiguang Zhao, Yuxi Wang, Yufei Liu, Bo Dai, Haoyu Guo, Chunhua Shen, Mulin Yu, Tao Lu, Junting Dong",
      venue: "arXiv 2026", year: 2026, tags: ["embodied", "perception"], selected: true,
      tldr: "Streaming, feed-forward recovery of world-space 3D hands and camera motion from egocentric video, trained on ~5,000 hours of footage.",
      links: { project: "https://infinihand.github.io/", arxiv: "https://arxiv.org/abs/2609.35743", code: "https://github.com/infinihand/InfiniHand" },
    },
    {
      id: "geoverse",
      title: "GeoVerse: World-Consistent Novel View Synthesis in Geometric Latent Space",
      authors: "Kerui Ren, Tao Lu, Linning Xu, Changjian Jiang, Mu Huang, Chunhua Shen, Mulin Yu†, Bo Dai†",
      venue: "arXiv 2026", year: 2026, tags: ["recon"], selected: true,
      tldr: "Generates novel views inside a 3D foundation model's geometric latent space, guided by video-generation priors and a global spatial memory.",
      links: { project: "https://geoverse-nvs.github.io/", arxiv: "https://arxiv.org/abs/2609.35734", code: "https://github.com/geoverse-nvs/GeoVerse" },
    },
    {
      id: "internw0",
      title: "InternW0-Δ: A World Action Model Bridging Predictive Dynamics and Actions with 20K+ Hours of Open Data",
      authors: "Xingyu Miao, Zizun Li, Baole Fang, Kaiwen Song, Tenghui Wang, Hanxue Zhang, Yating Wang, Xudong Li, Yuping He, Xueyuan Wei, Chao Gao, Xijie Yang, Yingxiang Xu, Kerui Ren, Wenqi Guo, Jianjun Zhou, Xinzhe Wang, Weiguang Zhao, Ni Yang, Zetao Cai, Yufei Xue, Hengjie Li, Zeyu He, Yuanzhen Zhou, Rong Fu, Jianyang Zhang, Siwei Cui, Fuxian Huang, Yunsong Zhou, Xing Gao, Yifei Yao, Qiaojun Yu, Kailin Li, Ming Zhou, Mu Huang, Xinyue Li, Wenze Cui, Bingqi Jiang, Xueyue Zhu, Junting Dong†, Haoyu Guo†, Tao Lu†, Mulin Yu†, Bowen Zhou, Bin Zhao, Tianfan Xue, Weinan Zhang†, Chunhua Shen†",
      venue: "arXiv 2026", year: 2026, tags: ["embodied"], selected: true,
      tldr: "A world action model that couples predictive visual dynamics with action generation, pretrained on 20K+ hours of robot, UMI and egocentric human data.",
      links: { project: "https://internrobotics.github.io/InternW0-Delta/", arxiv: "https://arxiv.org/abs/2609.31394" },
    },
    {
      id: "skel-wam",
      title: "Skel-WAM: A Hand-Skeleton-Conditioned World Action Model for Human-to-Robot Manipulation Transfer",
      authors: "Zetao Cai, Yaping Li, Yiqun Wang, Xinyu Zhan, Yuyin Yang, Haoxiang Ma, Kailin Li, Tao Lu, Jiangmiao Pang, Linning Xu, Dahua Lin",
      venue: "arXiv 2026", year: 2026, tags: ["embodied"],
      tldr: "A shared hand-skeleton interface lets human videos supervise a world action model without robot action labels.",
      links: { arxiv: "https://arxiv.org/abs/2609.21514" },
    },
    {
      id: "aquaflow",
      title: "AquaFlow: A Monocular Gaussian Splatting SLAM for Underwater Streaming Reconstruction",
      authors: "Yingxiang Xu, Kerui Ren, Wenqi Guo, Changjian Jiang, Tao Lu, Linning Xu, Mulin Yu",
      venue: "arXiv 2026", year: 2026, tags: ["recon"],
      tldr: "Streaming Gaussian Splatting SLAM for underwater video, with a physics-inspired model of attenuation and scattering.",
      links: { arxiv: "https://arxiv.org/abs/2608.22906" },
    },
    {
      id: "deform360",
      title: "Deform360: A Massive Multi-view Visuotactile Dataset for Deformable World Models",
      authors: "Hongyu Li, Wanjia Fu, Xiaoyan Cong, Zekun Li, Binghao Huang, Hanxiao Jiang, Xintong He, Yiqing Liang, Rao Fu, Tao Lu, Srinath Sridhar, Kevin A. Smith, George Konidaris, Yunzhu Li",
      venue: "ECCV 2026", year: 2026, tags: ["embodied"], selected: true,
      tldr: "215+ hours of 41-camera, visuotactile interaction with 198 deformable objects — a benchmark for 2D video vs. 3D particle world models.",
      links: { project: "https://deform360.lhy.xyz", arxiv: "https://arxiv.org/abs/2607.05390" },
    },
    {
      id: "m3",
      title: "M³: Dense Matching Meets Multi-View Foundation Models for Monocular Gaussian Splatting SLAM",
      authors: "Kerui Ren, Guanghao Li, Changjian Jiang, Yingxiang Xu, Tao Lu, Linning Xu, Junting Dong, Jiangmiao Pang, Mulin Yu, Bo Dai",
      venue: "arXiv 2026", year: 2026, tags: ["recon"],
      tldr: "Adds a dense matching head to a multi-view foundation model for accurate monocular Gaussian Splatting SLAM.",
      links: { project: "https://city-super.github.io/M3/", arxiv: "https://arxiv.org/abs/2603.16844" },
    },
    {
      id: "packuv",
      title: "PackUV: Packed Gaussian UV Maps for 4D Volumetric Video",
      authors: "Aashish Rai, Angela Xing, Anushka Agarwal, Xiaoyan Cong, Zekun Li, Tao Lu, Aayush Prakash, Srinath Sridhar",
      venue: "CVPR 2026", year: 2026, tags: ["recon"],
      tldr: "Packs 4D Gaussians into multi-scale UV atlases, so volumetric video works with standard video codecs.",
      links: { project: "https://ivl.cs.brown.edu/packuv", arxiv: "https://arxiv.org/abs/2602.23040" },
    },
    {
      id: "synthverse",
      title: "SynthVerse: A Large-Scale Diverse Synthetic Dataset for Point Tracking",
      authors: "Weiguang Zhao, Haoran Xu, Xingyu Miao, Qin Zhao, Rui Zhang, Kaizhu Huang, Ning Gao, Peizhou Cao, Mingze Sun, Mulin Yu, Tao Lu, Linning Xu, Junting Dong, Jiangmiao Pang",
      venue: "SIGGRAPH 2026", year: 2026, tags: ["perception"],
      tldr: "A large, diverse synthetic dataset and benchmark for general point tracking.",
      links: { paper: "https://doi.org/10.1145/3799902.3811183", arxiv: "https://arxiv.org/abs/2602.04441" },
    },
    {
      id: "trajvg",
      title: "TrajVG: 3D Trajectory-Coupled Visual Geometry Learning",
      authors: "Xingyu Miao, Weiguang Zhao, Tao Lu, Linning Xu, Mulin Yu, Yang Long, Jiangmiao Pang, Junting Dong",
      venue: "SIGGRAPH 2026", year: 2026, tags: ["recon", "perception"],
      tldr: "Feed-forward reconstruction that predicts explicit 3D trajectories, staying consistent when objects move.",
      links: { paper: "https://doi.org/10.1145/3799902.3811184", arxiv: "https://arxiv.org/abs/2602.04439" },
    },
    {
      id: "eag-pt",
      title: "EAG-PT: Emission-Aware Gaussians and Path Tracing for Diffuse Indoor Scene Reconstruction and Editing",
      authors: "Xijie Yang, Mulin Yu, Changjian Jiang, Kerui Ren, Tao Lu, Jiangmiao Pang, Dahua Lin, Bo Dai, Linning Xu",
      venue: "SIGGRAPH 2026", year: 2026, tags: ["recon"], selected: true,
      tldr: "Emission-aware 2D Gaussians plus path tracing for physically based, editable indoor scenes.",
      links: { project: "https://eag-pt.github.io", arxiv: "https://arxiv.org/abs/2601.23065" },
    },
    {
      id: "planing",
      title: "PLANING: A Loosely Coupled Triangle-Gaussian Framework for Streaming 3D Reconstruction",
      authors: "Changjian Jiang*, Kerui Ren*, Xudong Li, Kaiwen Song, Guanghao Li, Linning Xu, Tao Lu, Junting Dong, Yu Zhang†, Yu Feng, Bo Dai, Mulin Yu†",
      venue: "NeurIPS 2026", year: 2026, tags: ["recon"],
      tldr: "Triangles for geometry, neural Gaussians for appearance — fast streaming reconstruction with accurate surfaces.",
      links: { project: "https://city-super.github.io/PLANING/", arxiv: "https://arxiv.org/abs/2601.22046", code: "https://github.com/InternRobotics/PLANING" },
    },
    {
      id: "turbo-gs",
      title: "Turbo-GS: Accelerating 3D Gaussian Fitting for High-Quality Radiance Fields",
      authors: "Ankit Dhiman*, Tao Lu*, R Srinath*, Emre Arslan, Angela Xing, Yuanbo Xiangli, R Venkatesh Babu, Srinath Sridhar",
      venue: "CVPR 2026", award: "Highlight", year: 2026, tags: ["recon"], selected: true,
      tldr: "Fast 4K Gaussian fitting via dilated rendering and convergence-aware densification.",
      links: { project: "https://ivl.cs.brown.edu/research/turbo-gs", arxiv: "https://arxiv.org/abs/2412.13547", code: "https://github.com/inspirelt/Turbo-GS" },
    },

    // ───────────── 2025 ─────────────
    {
      id: "anysplat",
      title: "AnySplat: Feed-forward 3D Gaussian Splatting from Unconstrained Views",
      authors: "Lihan Jiang*, Yucheng Mao*, Linning Xu, Tao Lu, Kerui Ren, Yichen Jin, Xudong Xu, Mulin Yu, Jiangmiao Pang, Feng Zhao, Dahua Lin, Bo Dai",
      venue: "SIGGRAPH Asia 2025", year: 2025, tags: ["recon"], selected: true,
      tldr: "One forward pass from uncalibrated images to 3D Gaussians and camera poses.",
      links: { project: "https://city-super.github.io/anysplat/", arxiv: "https://arxiv.org/abs/2505.23716", code: "https://github.com/OpenRobotLab/AnySplat" },
    },
    {
      id: "gare",
      title: "GaRe: Relightable 3D Gaussian Splatting for Outdoor Scenes from Unconstrained Photo Collections",
      authors: "Haiyang Bai, Jiaqi Zhu, Songru Jiang, Wei Huang, Tao Lu, Yuanqi Li, Jie Guo, Runze Fu, Yanwen Guo, Lijun Chen",
      venue: "ICCV 2025", year: 2025, tags: ["recon"],
      tldr: "Outdoor relighting from internet photos, with separate sun, sky and indirect light and ray-traced shadows.",
      links: { paper: "https://openaccess.thecvf.com/content/ICCV2025/html/Bai_GaRe_Relightable_3D_Gaussian_Splatting_for_Outdoor_Scenes_from_Unconstrained_ICCV_2025_paper.html", arxiv: "https://arxiv.org/abs/2507.20512" },
    },
    {
      id: "horizon-gs",
      title: "Horizon-GS: Unified 3D Gaussian Splatting for Large-Scale Aerial-to-Ground Scenes",
      authors: "Lihan Jiang*, Kerui Ren*, Mulin Yu, Linning Xu, Junting Dong, Tao Lu, Feng Zhao, Dahua Lin, Bo Dai",
      venue: "CVPR 2025", year: 2025, tags: ["recon"],
      tldr: "Unified reconstruction and rendering across aerial and street-level views of large scenes.",
      links: { project: "https://city-super.github.io/horizon-gs/", arxiv: "https://arxiv.org/abs/2412.01745", code: "https://github.com/OpenRobotLab/HorizonGS" },
    },
    {
      id: "octree-gs",
      title: "Octree-GS: Towards Consistent Real-time Rendering with LOD-Structured 3D Gaussians",
      authors: "Kerui Ren*, Lihan Jiang*, Tao Lu, Mulin Yu, Linning Xu, Zhangkai Ni, Bo Dai†",
      venue: "TPAMI 2025", year: 2025, tags: ["recon"], selected: true,
      tldr: "An octree of anchors with levels of detail for consistent real-time rendering of city-scale scenes.",
      links: { project: "https://city-super.github.io/octree-gs/", arxiv: "https://arxiv.org/abs/2403.17898", code: "https://github.com/city-super/Octree-GS" },
    },
    {
      id: "mixrf",
      title: "MixRF: Universal Mixed Radiance Fields with Points and Rays Aggregation",
      authors: "Haiyang Bai, Tao Lu, Jiaqi Zhu, Wei Huang, Chang Gou, Jie Guo, Lijun Chen, Yanwen Guo",
      venue: "TVCG 2025", year: 2025, tags: ["recon"],
      links: { paper: "https://ieeexplore.ieee.org/document/11007514" },
    },
    {
      id: "proc-gs",
      title: "Proc-GS: Procedural Building Generation for City Assembly with 3D Gaussians",
      authors: "Yixuan Li, Xingjian Ran, Linning Xu, Tao Lu, Mulin Yu, Zhenzhi Wang, Yuanbo Xiangli, Dahua Lin, Bo Dai",
      venue: "CVPR 2025 Workshop", year: 2025, tags: ["recon"],
      tldr: "Procedural code meets 3D Gaussians for controllable, scalable building and city generation.",
      links: { project: "https://city-super.github.io/procgs/", arxiv: "https://arxiv.org/abs/2412.07660", code: "https://github.com/city-super/ProcGS/" },
    },
    {
      id: "art3d",
      title: "Art3D: Training-Free 3D Generation from Flat-Colored Illustration",
      authors: "Xiaoyan Cong, Jiayi Shen, Zekun Li, Rao Fu, Tao Lu, Srinath Sridhar",
      venue: "CVPR 2025 Workshop", year: 2025, tags: ["recon"],
      tldr: "Training-free lifting of flat-colored illustrations into 3D.",
      links: { project: "https://joy-jy11.github.io/", arxiv: "https://arxiv.org/abs/2504.10466" },
    },

    // ───────────── 2024 ─────────────
    {
      id: "gsdf",
      title: "GSDF: 3DGS Meets SDF for Improved Rendering and Reconstruction",
      authors: "Mulin Yu*, Tao Lu*, Linning Xu, Lihan Jiang, Yuanbo Xiangli†, Bo Dai",
      venue: "NeurIPS 2024", year: 2024, tags: ["recon"], selected: true,
      tldr: "A dual-branch design where Gaussians and an SDF guide each other — better rendering and better surfaces.",
      links: { project: "https://city-super.github.io/GSDF/", arxiv: "https://arxiv.org/abs/2403.16964", code: "https://github.com/city-super/GSDF" },
    },
    {
      id: "scaffold-gs",
      title: "Scaffold-GS: Structured 3D Gaussians for View-Adaptive Rendering",
      authors: "Tao Lu*, Mulin Yu*, Linning Xu, Yuanbo Xiangli, Limin Wang, Dahua Lin, Bo Dai†",
      venue: "CVPR 2024", award: "Highlight", year: 2024, tags: ["recon"], selected: true,
      tldr: "Anchor-based neural Gaussians: faster convergence, fewer primitives, better view-adaptive quality.",
      links: { project: "https://city-super.github.io/scaffold-gs/", arxiv: "https://arxiv.org/abs/2312.00109", code: "https://github.com/city-super/Scaffold-GS" },
    },

    // ───────────── 2023 ─────────────
    {
      id: "link",
      title: "LinK: Linear Kernel for LiDAR-based 3D Perception",
      authors: "Tao Lu, Xiang Ding, Haisong Liu, Gangshan Wu, Limin Wang†",
      venue: "CVPR 2023", year: 2023, tags: ["perception"], selected: true,
      tldr: "Scales 3D convolution kernels up to large sizes with linear complexity for sparse LiDAR data.",
      links: { paper: "https://openaccess.thecvf.com/content/CVPR2023/html/Lu_LinK_Linear_Kernel_for_LiDAR-Based_3D_Perception_CVPR_2023_paper.html", arxiv: "https://arxiv.org/abs/2303.16094", code: "https://github.com/MCG-NJU/LinK" },
    },
    {
      id: "sparsebev",
      title: "SparseBEV: High-Performance Sparse 3D Object Detection from Multi-Camera Videos",
      authors: "Haisong Liu, Yao Teng, Tao Lu, Haiguang Wang, Limin Wang†",
      venue: "ICCV 2023", year: 2023, tags: ["perception"],
      tldr: "Fully sparse, query-based 3D detection from multi-camera video.",
      links: { paper: "https://openaccess.thecvf.com/content/ICCV2023/papers/Liu_SparseBEV_High-Performance_Sparse_3D_Object_Detection_from_Multi-Camera_Videos_ICCV_2023_paper.pdf", arxiv: "https://arxiv.org/abs/2308.09244", code: "https://github.com/MCG-NJU/SparseBEV" },
    },
    {
      id: "camliflow-pami",
      title: "Learning Optical Flow and Scene Flow with Bidirectional Camera-LiDAR Fusion",
      authors: "Haisong Liu, Tao Lu, Yihui Xu, Jia Liu, Limin Wang†",
      venue: "TPAMI 2023", year: 2023, tags: ["perception"],
      tldr: "The journal extension of CamLiFlow.",
      links: { arxiv: "https://arxiv.org/abs/2303.12017", code: "https://github.com/MCG-NJU/CamLiFlow" },
    },
    {
      id: "app-net",
      title: "APP-Net: Auxiliary-Point-Based Push and Pull Operations for Efficient Point Cloud Recognition",
      authors: "Tao Lu, Chunxu Liu, Youxin Chen, Gangshan Wu, Limin Wang†",
      venue: "TIP 2023", year: 2023, tags: ["perception"],
      tldr: "Push-and-pull operations on auxiliary points — over 10k fps point cloud recognition on a single GPU.",
      links: { arxiv: "https://arxiv.org/abs/2205.00847", code: "https://github.com/MCG-NJU/APP-Net" },
    },

    // ───────────── 2022 ─────────────
    {
      id: "camliflow",
      title: "CamLiFlow: Bidirectional Camera-LiDAR Fusion for Joint Optical Flow and Scene Flow Estimation",
      authors: "Haisong Liu, Tao Lu, Yihui Xu, Jia Liu, Wenjie Li, Lijun Chen",
      venue: "CVPR 2022", award: "Oral", year: 2022, tags: ["perception"],
      tldr: "Multi-stage, bidirectional fusion of camera and LiDAR branches.",
      links: { paper: "https://openaccess.thecvf.com/content/CVPR2022/papers/Liu_CamLiFlow_Bidirectional_Camera-LiDAR_Fusion_for_Joint_Optical_Flow_and_Scene_CVPR_2022_paper.pdf", arxiv: "https://arxiv.org/abs/2111.10502", code: "https://github.com/MCG-NJU/CamLiFlow" },
    },

    // ───────────── 2021 ─────────────
    {
      id: "cga-net",
      title: "CGA-Net: Category Guided Aggregation for Point Cloud Semantic Segmentation",
      authors: "Tao Lu, Limin Wang†, Gangshan Wu",
      venue: "CVPR 2021", year: 2021, tags: ["perception"],
      tldr: "Category-guided aggregation to counter class imbalance in point cloud segmentation.",
      links: { paper: "https://openaccess.thecvf.com/content/CVPR2021/html/Lu_CGA-Net_Category_Guided_Aggregation_for_Point_Cloud_Semantic_Segmentation_CVPR_2021_paper.html", code: "https://github.com/MCG-NJU/CGA-Net" },
    },
  ],
};
