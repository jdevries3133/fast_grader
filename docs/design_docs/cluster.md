# Creating a Production Grade Kubernetes Cluster

I am cheap... or, maybe I am dumb. Either way, I'm going to start out by
running things on my own Kubernetes cluster and see how it goes.

## [MicroK8s](https://microk8s.io/)

This seems very easy to set up. The only caveat is that it wants 3 machines,
so I'll get one more computer and also include the rasberry pi.

MicroK8s uses [Dqlite](https://dqlite.io/) instead of etcd for cluster state.
This is much more lightweight and simple, but requires 3 machines for high
availibility.

### High Availability

Using three devices achieves the high availibility requirements of microk8s.
If one machine fails, the cluster should persist.

### Storage

A 3-drive Raid 1E array will live inside of `big-boi`, the workstation PC from
Craigslist. This ensures better disaster recovery than Raid 5, at the cost of
only one drive's worth of space being available. That being said, 120Gb of
storage should be OK for the postgresql database for quite some time.

The storage will be snapshotted and uploaded to an S3 bucket daily.

# Disaster Recovery Scenarios

## Tell's or Nick's Computer Crashes

### Expected Outcome

This should have no effect on the cluster. The master node and data store will
persist.

### Recovery Steps

1. If possible, add a backup machine to the cluster to avoid a reduction in
   capacity.
2. Fix failures on the failing machine.

## `big-boi` Failure (Failure of Master Node)

### Expected Outcome

This will, at minimum, mess with postgres, because cluster storage will become
unavailable. I don't know if this will crash the cluster or just make postgres
unavailable, but it will make the site dysfunctional either way.

### Minimizing Impact

Note that by using cloud storage instead of a Raid array buit into `big-boi`,
the cluster will be able to tolerate the failure of this master node by
electing a new leader, and cloud storage will remain available. However, this
comes at the cost of dependency on cloud storage, and I believe that it will
also cause a lot of latency and degrade the performance of the database if it's
always flushing writes into cloud storage.

Another option is a separate network attached storage server, but that just
moves the single point of failure elsewhere, unless this is also a distributed
highly available system. I don't see the advantage over a raid array built into
`big-boi`.

### Recovery Steps

1. Download the most recent storage snapshot.
2. Put the snapshot onto one of the surviving machines.
3. Mount this as the storage in the cluster, and restart the site.
4. Repair `big-boi`
5. `big-boi` re-joins the cluster, move persistent storage back onto a RAID
   array.
