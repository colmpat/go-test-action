import type { TestEvent, TestEventActionConclusion } from './events'

export type TestResults = { [testName: string]: TestResult }
export type ConclusionResults = { [key in TestEventActionConclusion]: number }

export interface TestResult {
  conclusion?: TestEventActionConclusion
  subtests?: TestResults
  points?: number
}

class PackageResult {
  packageEvent: TestEvent
  events: TestEvent[]
  tests: TestResults = {}
  pointsPossible: number = 0
  pointsEarned: number = 0
  conclusions: ConclusionResults = {
    pass: 0,
    fail: 0,
    skip: 0,
  }

  constructor(packageEvent: TestEvent, events: TestEvent[]) {
    this.packageEvent = packageEvent
    this.events = events.filter(
      e => !e.isPackageLevel && e.package === this.packageEvent.package
    )

    this.eventsToResults()
  }

  public testCount(): number {
    return Object.values(this.conclusions).reduce((a, b) => a + b)
  }

  public hasTests(): boolean {
    return this.testCount() !== 0
  }

  public output(): string {
    return this.events.map(e => e.output).join('')
  }

  /**
   * Iterate through test events, find anything that is a conclusive results and record it
   */
  private eventsToResults() {
    for (let event of this.events) {
      if (!event.isConclusive) {
        // if the event doesn't have a conclusion action, we don't need anything else from it
        continue
      }

      const conclusion = event.action as TestEventActionConclusion
      this.conclusions[conclusion] += 1

      if (event.isSubtest) {
        const parentEvent = event.test.split('/')[0]

        this.tests[parentEvent] = {
          ...(this.tests[parentEvent] || {}),
          subtests: {
            [event.test]: { conclusion },
            ...this.tests[parentEvent]?.subtests,
          },
        }
      } else {
        let conclusion = event.action as TestEventActionConclusion
        let pointsEarned = conclusion === 'pass' && event.pointsPossible ? event.pointsPossible : 0;
        this.pointsPossible += event.pointsPossible || 0
        this.pointsEarned += pointsEarned
        this.tests[event.test] = {
          conclusion,
          subtests: this.tests[event.test]?.subtests || {},
          points: pointsEarned,
        }
      }
    }
  }
}

export default PackageResult
