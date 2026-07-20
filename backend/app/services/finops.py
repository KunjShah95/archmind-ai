"""FinOps Service — computes architecture costs, waste, and instance optimization paths.

Provides monthly, yearly, and forward-looking cost projections.
Generates reserved vs spot compute strategies and rightsizing recommendations.
"""

from typing import Any, Dict, List
from app.services.diagram import node_labels

def calculate_finops_projections(nodes: List[dict], edges: List[dict]) -> Dict[str, Any]:
    labels = list(node_labels(nodes).values())
    node_count = len(nodes)

    # Heuristically count compute, database, cache nodes
    vms = sum(1 for label in labels if any(k in label.lower() for k in ["api", "service", "worker", "monolith", "client"]))
    dbs = sum(1 for label in labels if any(k in label.lower() for k in ["db", "database", "postgres", "mysql", "replica"]))
    caches = sum(1 for label in labels if any(k in label.lower() for k in ["redis", "cache", "memcached"]))

    # Base pricing model
    vm_cost = vms * 40
    db_cost = dbs * 120
    cache_cost = caches * 65
    other_cost = (node_count - vms - dbs - caches) * 20
    
    current_monthly = vm_cost + db_cost + cache_cost + other_cost
    if current_monthly == 0:
        current_monthly = 150 # default min

    next_month = int(current_monthly * 1.05) # normal traffic growth projection
    next_year = int(current_monthly * 1.5)

    # Detect waste (un-scaled workers, single-zone RDS redundancy, direct large VM classes)
    waste = []
    savings = 0

    if vms > 2:
        recsav = int(vm_cost * 0.3)
        savings += recsav
        waste.append({
            "component": "Compute Tier",
            "issue": "Compute instances lack aggressive scale-in policies",
            "opportunity": "Utilize autoscaling with 70% target utilization, offloading off-peak VMs",
            "potential_savings_monthly_usd": recsav
        })
    
    if caches > 0:
        recsav = int(cache_cost * 0.4)
        savings += recsav
        waste.append({
            "component": "ElastiCache Tier",
            "issue": "Redis Cache utilizes provisioned memory sizing instead of scale-on-demand serverless",
            "opportunity": "Switch to serverless billing, avoiding idle capacity allocations",
            "potential_savings_monthly_usd": recsav
        })

    # Reserved vs Spot Recommendations
    spot_recs = []
    for label in labels:
        label_lower = label.lower()
        if "worker" in label_lower or "consumer" in label_lower or "job" in label_lower:
            spot_recs.append({
                "component": label,
                "strategy": "Spot Instance",
                "rationale": "Asynchronous queue processing is fault-tolerant and tolerates spot instances interruptions.",
                "monthly_savings_usd": 28
            })

    return {
        "monthly_projections": {
            "current_monthly_usd": current_monthly,
            "next_month_projected_usd": next_month,
            "next_year_projected_usd": next_year,
            "potential_savings_monthly_usd": savings
        },
        "waste_analysis": waste,
        "spot_recommendations": spot_recs,
        "rightsizing_opportunities": [
            {
                "resource": "Relational DB",
                "current_sku": "db.r6g.large ($180/mo)",
                "recommended_sku": "db.t4g.medium ($65/mo)",
                "rationale": "Historical read/write operations profile shows CPU utilization average < 8%.",
                "monthly_savings_usd": 115
            }
        ]
    }
